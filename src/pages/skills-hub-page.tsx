/**
 * Skills Hub Page
 * Main page for browsing and managing skills in the hub
 */

import { useState } from 'react'
import { Search, Filter, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SkillCard } from '@/components/skill-hub'
import { useSkills, useNamespaces, useLabels } from '@/hooks/use-skill-hub'
import { LabelSelector } from '@/components/skill-hub'

// Mock tenant ID - in production this would come from auth context
const TENANT_ID = 'default'

export function SkillsHubPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>()
  const [selectedLabels, setSelectedLabels] = useState<number[]>([])

  // Fetch data
  const { data: skills, loading, error } = useSkills({
    tenant_id: TENANT_ID,
    query: searchQuery,
    namespace: selectedNamespace,
    page: 1,
    page_size: 20,
  })

  const { data: namespaces } = useNamespaces(TENANT_ID)
  const { data: labels } = useLabels(TENANT_ID)

  const handleLabelToggle = (label: any) => {
    if (selectedLabels.includes(label.id)) {
      setSelectedLabels(prev => prev.filter(id => id !== label.id))
    } else {
      setSelectedLabels(prev => [...prev, label.id])
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Skills Hub</h1>
        <p className="text-muted-foreground">
          Discover and share AI skills with the community
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Publish Skill
            </Button>
          </div>

          {/* Label Filter */}
          {labels && labels.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Filter by labels:</p>
              <LabelSelector
                availableLabels={labels}
                selectedLabels={labels.filter(l => selectedLabels.includes(l.id))}
                onToggle={handleLabelToggle}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading skills...
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load skills: {error.message}</p>
          </CardContent>
        </Card>
      ) : skills && skills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onClick={() => window.location.href = `/skills/${skill.namespace}/${skill.slug}`}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No skills found. Try adjusting your search or filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
