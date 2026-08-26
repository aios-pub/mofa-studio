/**
 * TOOL-16 解题答疑 (边界声明: 只做拍照解题+分步讲解，不做错题本/学情追踪).
 * 学科目录与讲解 prompt 组装 —— 要求模型先复述识别出的题目，再分步推演，
 * 数学公式用 LaTeX（页面 KaTeX 渲染），并明确区分「题目看不清」的诚实路径。
 */

export interface Subject {
  id: string;
  label: string;
  hint: string;
}

export const SUBJECTS: Subject[] = [
  { id: "math", label: "数学", hint: "给出每一步推导与所用定理/公式，最后单独一行给出最终答案" },
  { id: "physics", label: "物理", hint: "先写已知量与单位，再列方程推导，注明所用定律，结果带单位" },
  { id: "chemistry", label: "化学", hint: "先写出题干涉及的方程式/物质，再分步推理，注意配平与守恒" },
];

export const SOLVER_PROMPT_HEAD = `你是一名严谨的学科老师。图中是一道题目，请按以下结构作答：
1. 【题目】先用文字复述你识别到的题目（若图片模糊或残缺，如实说明看不清的部分并停止，不要编题）。
2. 【思路】一两句话点明考察点与解法方向。
3. 【分步讲解】逐步推理，每步标注依据；数学表达式用 $...$ 或 $$...$$ 的 LaTeX 输出。
4. 【答案】最终结果单独成行。
5. 【易错点】提醒这题最常见的 1-2 个错误。`;

/** 组装讲解 prompt：学科要求 + 学生补充说明. */
export function buildSolverPrompt(subjectId: string, extraNote?: string): string {
  const subject = SUBJECTS.find((s) => s.id === subjectId) ?? SUBJECTS[0];
  const note = extraNote?.trim()
    ? `\n6. 【补充说明回应】学生附言：「${extraNote.trim()}」，请在讲解中回应。`
    : "";
  return `${SOLVER_PROMPT_HEAD}\n\n学科要求（${subject.label}）：${subject.hint}${note}`;
}

/** 空图片 / 未选学科的校验（页面在发送前调用）. */
export function validateSolverInput(
  hasImage: boolean,
  subjectId: string,
): { ok: true } | { ok: false; reason: string } {
  if (!hasImage) return { ok: false, reason: "请先上传或拍摄题目照片" };
  if (!SUBJECTS.some((s) => s.id === subjectId)) {
    return { ok: false, reason: "请选择学科" };
  }
  return { ok: true };
}
