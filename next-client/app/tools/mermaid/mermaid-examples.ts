// Starter diagrams for the Mermaid tool, one per common diagram type. The
// first one is shown on a first visit.
export const MERMAID_EXAMPLES: { id: string; label: string; source: string }[] = [
  {
    id: "flowchart",
    label: "Flowchart",
    source: `flowchart TD
    A[Write in Markdown] --> B{Need a diagram?}
    B -->|Yes| C[Add a mermaid block]
    B -->|No| D[Keep writing]
    C --> E[Preview it live]
    E --> D`,
  },
  {
    id: "sequence",
    label: "Sequence",
    source: `sequenceDiagram
    participant U as User
    participant E as Editor
    participant D as Disk
    U->>E: Type a note
    E->>D: Autosave
    D-->>E: Saved
    E-->>U: Saved indicator`,
  },
  {
    id: "class",
    label: "Class",
    source: `classDiagram
    class Note {
      +String title
      +String body
      +save()
    }
    class Vault {
      +String name
      +open()
    }
    Vault "1" --> "*" Note : contains`,
  },
  {
    id: "state",
    label: "State",
    source: `stateDiagram-v2
    [*] --> Draft
    Draft --> Review : submit
    Review --> Draft : changes requested
    Review --> Published : approve
    Published --> [*]`,
  },
  {
    id: "er",
    label: "Entity relationship",
    source: `erDiagram
    AUTHOR ||--o{ NOTE : writes
    NOTE }o--o{ TAG : "tagged with"
    AUTHOR {
      string name
    }
    NOTE {
      string title
      date created
    }`,
  },
  {
    id: "gantt",
    label: "Gantt",
    source: `gantt
    title Launch plan
    dateFormat YYYY-MM-DD
    section Build
    Design      :a1, 2026-10-01, 7d
    Implement   :a2, after a1, 10d
    section Ship
    Beta        :after a2, 5d
    Release     :milestone, 2026-10-25, 0d`,
  },
  {
    id: "pie",
    label: "Pie",
    source: `pie title Where the week went
    "Writing" : 45
    "Meetings" : 25
    "Review" : 20
    "Email" : 10`,
  },
  {
    id: "mindmap",
    label: "Mind map",
    source: `mindmap
  root((Markdown))
    Notes
      Daily log
      Meetings
    Docs
      README
      Guides
    Diagrams
      Flowcharts
      Sequences`,
  },
];
