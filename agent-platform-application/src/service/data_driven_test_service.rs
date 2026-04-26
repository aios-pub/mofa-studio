/**
 * 数据驱动测试服务
 * 处理CSV/JSON数据源的展开和批量执行
 */

use crate::model::error::AppError;
use crate::model::test_execution::{TestCaseExecution, TestCaseExecutionResult, TestExecutionContext};
use crate::model::data_driven_test::{DataRow, DataDrivenTestConfig};
use sea_orm::prelude::Uuid;
use std::collections::HashMap;
use serde_json::Value;

#[derive(Clone)]
pub struct DataDrivenTestService {
    execution_engine: Arc<super::test_execution_engine::TestExecutionEngine>,
}

impl DataDrivenTestService {
    pub fn new(
        execution_engine: Arc<super::test_execution_engine::TestExecutionEngine>,
    ) -> Self {
        Self { execution_engine }
    }

    /// 执行数据驱动测试
    pub async fn execute_data_driven_test(
        &self,
        test_case: TestCaseExecution,
        config: &DataDrivenTestConfig,
        context: &TestExecutionContext,
    ) -> Result<DataDrivenTestResult, AppError> {
        let data_rows = self.parse_data_source(&config.data_source_type, &config.data_source_data)?;

        let mut results = Vec::new();
        let mut passed = 0;
        let mut failed = 0;

        for (index, data_row) in data_rows.iter().enumerate() {
            // 应用变量映射
            let mut variables = HashMap::new();
            for (key, value) in &data_row.data {
                if let Some(mapped_name) = config.variable_mapping.get(key) {
                    variables.insert(mapped_name.clone(), value.clone());
                } else {
                    variables.insert(key.clone(), value.clone());
                }
            }

            // 更新执行上下文的环境变量
            {
                let mut env = context.environment.lock().await;
                for (key, value) in &variables {
                    env.insert(key.clone(), value.clone());
                }
            }

            // 创建该行的测试执行
            let mut row_test_case = test_case.clone();
            self.apply_variables_to_request(&mut row_test_case, &variables);

            // 执行测试
            let result = self
                .execution_engine
                .execute_test_case(row_test_case, context)
                .await?;

            if result.status == "passed" {
                passed += 1;
            } else {
                failed += 1;
            }

            results.push(DataRowExecution {
                index: index as i32,
                data: data_row.data.clone(),
                variables: variables.clone(),
                result,
            });
        }

        Ok(DataDrivenTestResult {
            test_case_id: test_case.id,
            total_iterations: data_rows.len() as i32,
            passed_iterations: passed,
            failed_iterations: failed,
            iteration_results: results,
        })
    }

    /// 解析数据源
    fn parse_data_source(&self, source_type: &str, data: &str) -> Result<Vec<DataRow>, AppError> {
        match source_type {
            "json" => self.parse_json_data(data),
            "csv" => self.parse_csv_data(data),
            _ => Err(AppError::CustomError(format!(
                "Unsupported data source type: {}",
                source_type
            ))),
        }
    }

    /// 解析JSON数据
    fn parse_json_data(&self, data: &str) -> Result<Vec<DataRow>, AppError> {
        let json_value: Value = serde_json::from_str(data)
            .map_err(|_| AppError::CustomError("Invalid JSON data".to_string()))?;

        if let Value::Array(array) = json_value {
            Ok(array
                .iter()
                .enumerate()
                .map(|(index, item)| {
                    let data_map = if let Value::Object(obj) = item {
                        obj.iter()
                            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                            .collect()
                    } else {
                        HashMap::new()
                    };
                    DataRow {
                        index: index + 1,
                        data: data_map,
                        variables: HashMap::new(),
                    }
                })
                .collect())
        } else if let Value::Object(obj) = json_value {
            Ok(vec![DataRow {
                index: 1,
                data: obj
                    .iter()
                    .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                    .collect(),
                variables: HashMap::new(),
            }])
        } else {
            Err(AppError::CustomError("JSON must be an object or array".to_string()))
        }
    }

    /// 解析CSV数据
    fn parse_csv_data(&self, data: &str) -> Result<Vec<DataRow>, AppError> {
        let mut rows = Vec::new();
        let lines: Vec<&str> = data.lines().collect();

        if lines.is_empty() {
            return Ok(rows);
        }

        // 解析头部
        let headers: Vec<String> = lines[0]
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        // 解析数据行
        for (index, line) in lines.iter().skip(1).enumerate() {
            let values: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            let mut data_map = HashMap::new();

            for (i, header) in headers.iter().enumerate() {
                let value = values.get(i).map(|s| s.to_string()).unwrap_or_default();
                data_map.insert(header.clone(), value);
            }

            rows.push(DataRow {
                index: index + 1,
                data: data_map,
                variables: HashMap::new(),
            });
        }

        Ok(rows)
    }

    /// 应用变量到请求配置
    fn apply_variables_to_request(&self, test_case: &mut TestCaseExecution, variables: &HashMap<String, String>) {
        // 替换URL中的变量
        for (key, value) in variables {
            let placeholder = format!("{{{{{}}}}}", key);
            test_case.request_url = test_case.request_url.replace(&placeholder, value);
        }

        // 替换Headers中的变量
        for (_key, header_value) in test_case.headers.iter_mut() {
            for (key, value) in variables {
                let placeholder = format!("{{{{{}}}}}", key);
                *header_value = header_value.replace(&placeholder, value);
            }
        }

        // 替换Body中的变量
        if let Some(body) = &mut test_case.request_body {
            for (key, value) in variables {
                let placeholder = format!("{{{{{}}}}}", key);
                *body = body.replace(&placeholder, value);
            }
        }
    }
}

/// 数据行
#[derive(Debug, Clone)]
pub struct DataRow {
    pub index: usize,
    pub data: HashMap<String, String>,
    pub variables: HashMap<String, String>,
}

/// 数据行执行结果
#[derive(Debug, Clone)]
pub struct DataRowExecution {
    pub index: i32,
    pub data: HashMap<String, String>,
    pub variables: HashMap<String, String>,
    pub result: TestCaseExecutionResult,
}

/// 数据驱动测试配置
#[derive(Debug, Clone)]
pub struct DataDrivenTestConfig {
    pub id: Uuid,
    pub test_case_id: Uuid,
    pub name: String,
    pub data_source_type: String,
    pub data_source_data: String,
    pub variable_mapping: HashMap<String, String>,
    pub enabled: bool,
}

/// 数据驱动测试结果
#[derive(Debug, Clone)]
pub struct DataDrivenTestResult {
    pub test_case_id: Uuid,
    pub total_iterations: i32,
    pub passed_iterations: i32,
    pub failed_iterations: i32,
    pub iteration_results: Vec<DataRowExecution>,
}
