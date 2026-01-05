# Frontend Fundamentals for Backend Engineers

**For**: Python/DevOps engineers new to React/Next.js/TypeScript
**Goal**: Understand key concepts to effectively work with Claude Code on the migration

---

## Part 1: Core Web Concepts

### HTML, CSS, JavaScript - The Foundation

**HTML** (Structure):

```html
<!-- Defines WHAT appears on page -->
<div class="patient-card">
  <h1>John Doe</h1>
  <p>Age: 65</p>
</div>
```

Think of it like: **JSON structure for web pages**

**CSS** (Styling):

```css
/* Defines HOW it looks */
.patient-card {
  background: white;
  padding: 16px;
  border-radius: 8px;
}
```

Think of it like: **Styling rules for HTML elements**

**JavaScript** (Behavior):

```javascript
// Defines WHAT HAPPENS when user interacts
button.addEventListener('click', () => {
  alert('Patient saved!');
});
```

Think of it like: **Python scripts that run in the browser**

---

## Part 2: React - The Component Model

### What is React?

**Concept**: Build UIs from reusable "components" (like Python functions that return HTML)

```jsx
// This is a React component
function PatientCard({ patient }) {
  return (
    <div className="patient-card">
      <h1>{patient.name}</h1>
      <p>Age: {patient.age}</p>
    </div>
  );
}

// Use it like:
<PatientCard patient={{ name: 'John', age: 65 }} />;
```

**Python Analogy**:

```python
def patient_card(patient):
    return f"""
    <div class="patient-card">
      <h1>{patient['name']}</h1>
      <p>Age: {patient['age']}</p>
    </div>
    """

# Call it
html = patient_card({"name": "John", "age": 65})
```

### State - Data That Changes

**React State** = variables that trigger re-render when changed

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0); // Like a class property

  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

**Python Analogy**:

```python
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
        self.render()  # React does this automatically!
```

### Effects - Side Effects on State Change

**useEffect** = run code when component mounts or data changes

```jsx
import { useEffect, useState } from 'react';

function PatientLoader({ patientId }) {
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    // This runs when patientId changes (like __init__ or property setter)
    fetch(`/api/patients/${patientId}`)
      .then((res) => res.json())
      .then((data) => setPatient(data));
  }, [patientId]); // "Dependencies" - re-run when patientId changes

  return <div>{patient?.name}</div>;
}
```

**Python Analogy**:

```python
class PatientLoader:
    def __init__(self, patient_id):
        self.patient_id = patient_id
        self.patient = None
        self._load_patient()

    def _load_patient(self):
        self.patient = requests.get(f"/api/patients/{self.patient_id}").json()
```

---

## Part 3: Next.js - React Framework

### What is Next.js?

**Concept**: Framework on top of React (like Django is to Python)

- **React**: Library for building UIs
- **Next.js**: Full framework with routing, API routes, server rendering

### File-Based Routing

**Next.js App Router** (current project uses this):

```
src/app/
├── page.tsx                    → Homepage (/)
├── patients/
│   ├── page.tsx                → /patients
│   └── [id]/page.tsx           → /patients/123 (dynamic)
└── refills/page.tsx            → /refills
```

**Python Analogy** (Django):

```python
# urls.py
urlpatterns = [
    path('', views.home),                       # /
    path('patients/', views.patients),          # /patients
    path('patients/<int:id>/', views.patient),  # /patients/123
]
```

### Server vs Client Components

**Server Component** (default):

```tsx
// Runs on server, sends HTML to browser
export default async function Page() {
  const data = await db.query('SELECT * FROM patients');
  return <div>{data.map(...)}</div>;
}
```

**Client Component** (interactive):

```tsx
'use client'; // This directive makes it run in browser

import { useState } from 'react';

export default function Page() {
  const [count, setCount] = useState(0); // State only works in client
  return <button onClick={() => setCount(count + 1)}>Click</button>;
}
```

**Python Analogy**:

- Server Component = **Jinja2 template** (server-rendered)
- Client Component = **AJAX + JavaScript** (browser-interactive)

---

## Part 4: TypeScript - Typed JavaScript

### What is TypeScript?

**Concept**: JavaScript + type annotations (like Python type hints)

```typescript
// JavaScript
function calculatePDC(dispenses) {
  return dispenses.reduce((sum, d) => sum + d.daysSupply, 0);
}

// TypeScript
interface Dispense {
  daysSupply: number;
  fillDate: string;
}

function calculatePDC(dispenses: Dispense[]): number {
  return dispenses.reduce((sum, d) => sum + d.daysSupply, 0);
}
```

**Python Analogy**:

```python
from typing import List

class Dispense:
    days_supply: int
    fill_date: str

def calculate_pdc(dispenses: List[Dispense]) -> float:
    return sum(d.days_supply for d in dispenses)
```

### When to Use `any` (Escape Hatch)

```typescript
// When you don't know or don't care about types
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// Like Python's `Any` from typing
from typing import Any
def process_data(data: Any) -> Any:
    return [item['value'] for item in data]
```

---

## Part 5: Key Libraries in This Project

### Medplum - FHIR Platform SDK

**Concept**: Like an ORM for FHIR resources (similar to SQLAlchemy for databases)

```typescript
import { useMedplum } from '@medplum/react';

function Component() {
  const medplum = useMedplum(); // Client instance

  // Query patients (like db.query())
  const patients = await medplum.searchResources('Patient', {
    active: 'true',
    _count: 100,
  });

  // Get one patient (like Patient.objects.get(id=123))
  const patient = await medplum.readResource('Patient', 'P001');
}
```

**Python Analogy** (Django ORM):

```python
# Medplum searchResources
patients = Patient.objects.filter(active=True)[:100]

# Medplum readResource
patient = Patient.objects.get(id='P001')
```

### TailwindCSS - Utility-First Styling

**Concept**: CSS classes for every style property (no custom CSS files)

```jsx
// Instead of writing CSS
<div className="bg-blue-500 text-white p-4 rounded-lg">
  Patient Card
</div>

// Equivalent to CSS:
.my-card {
  background-color: #3b82f6;  /* blue-500 */
  color: white;
  padding: 1rem;              /* p-4 */
  border-radius: 0.5rem;      /* rounded-lg */
}
```

**Why it's useful**: Fast prototyping, no naming conflicts, easy to copy styles

### Zustand - State Management

**Concept**: Global state store (like Redis, but in browser memory)

```typescript
import { create } from 'zustand';

// Define store (like a Python class)
const usePatientStore = create((set) => ({
  patients: [],
  selectedId: null,

  setPatients: (patients) => set({ patients }),
  selectPatient: (id) => set({ selectedId: id }),
}));

// Use in component
function Component() {
  const patients = usePatientStore(state => state.patients);
  const selectPatient = usePatientStore(state => state.selectPatient);

  return <div onClick={() => selectPatient('P001')}>...</div>;
}
```

**Python Analogy**:

```python
# Like a global singleton
class PatientStore:
    patients = []
    selected_id = None

    @classmethod
    def set_patients(cls, patients):
        cls.patients = patients

    @classmethod
    def select_patient(cls, id):
        cls.selected_id = id
```

---

## Part 6: Common Patterns in React

### Pattern 1: Mapping Data to UI

```jsx
// Like Python list comprehension
function PatientList({ patients }) {
  return (
    <div>
      {patients.map((patient) => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
```

**Python Equivalent**:

```python
def patient_list(patients):
    return '\n'.join([
        patient_card(patient)
        for patient in patients
    ])
```

### Pattern 2: Conditional Rendering

```jsx
function PatientCard({ patient }) {
  return (
    <div>
      <h1>{patient.name}</h1>
      {patient.pdc >= 80 ? (
        <span className="text-green-500">Passing</span>
      ) : (
        <span className="text-red-500">At Risk</span>
      )}
    </div>
  );
}
```

**Python Equivalent**:

```python
def patient_card(patient):
    status = "Passing" if patient.pdc >= 80 else "At Risk"
    color = "green" if patient.pdc >= 80 else "red"
    return f"<span class='text-{color}-500'>{status}</span>"
```

### Pattern 3: Event Handlers

```jsx
function Button() {
  const handleClick = () => {
    console.log('Clicked!');
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

**Python Analogy** (Flask route):

```python
@app.route('/button', methods=['POST'])
def handle_click():
    print('Clicked!')
    return 'OK'
```

---

## Part 7: Async Operations in React

### Fetching Data

```jsx
import { useEffect, useState } from 'react';

function PatientLoader({ patientId }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Like async def in Python
    async function loadPatient() {
      try {
        const response = await fetch(`/api/patients/${patientId}`);
        const data = await response.json();
        setPatient(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadPatient();
  }, [patientId]);

  if (loading) return <div>Loading...</div>;
  return <div>{patient.name}</div>;
}
```

**Python Equivalent**:

```python
import asyncio

class PatientLoader:
    def __init__(self, patient_id):
        self.patient = None
        self.loading = True
        asyncio.run(self._load_patient(patient_id))

    async def _load_patient(self, patient_id):
        try:
            response = await fetch(f"/api/patients/{patient_id}")
            self.patient = await response.json()
        except Exception as e:
            print(e)
        finally:
            self.loading = False
```

---

## Part 8: Our Migration-Specific Concepts

### The Adapter Layer

**Problem**: Legacy app expects patient data in one shape, Medplum FHIR has different shape

**Solution**: Adapter function that transforms FHIR → Legacy

```typescript
// FHIR structure (Medplum)
{
  resourceType: "Patient",
  id: "P001",
  name: [{ given: ["John"], family: "Doe" }],
  birthDate: "1960-01-01"
}

// Legacy structure (Firebase)
{
  id: "P001",
  firstName: "John",
  lastName: "Doe",
  dateOfBirth: "1960-01-01",
  medications: [...],  // Pre-calculated
  aggregateMetrics: {...}
}

// Adapter (transform function)
async function constructLegacyPatientObject(patientId, medplum) {
  const fhirPatient = await medplum.readResource('Patient', patientId);
  const observations = await medplum.searchResources('Observation', {...});

  return {
    id: fhirPatient.id,
    firstName: fhirPatient.name[0].given[0],
    lastName: fhirPatient.name[0].family,
    medications: transformObservationsToMedications(observations),
    // ... more transformations
  };
}
```

**Python Analogy**:

```python
# SQLAlchemy model
class PatientORM:
    id: str
    name: str
    birth_date: datetime

# Legacy dict format
def orm_to_legacy(patient_orm):
    return {
        'id': patient_orm.id,
        'firstName': patient_orm.name.split()[0],
        'dateOfBirth': patient_orm.birth_date.isoformat(),
        'medications': calculate_medications(patient_orm),
    }
```

### Context Providers - Global State

**Concept**: Like Flask's `g` object or Django's middleware context

```jsx
// Provider wraps your app
<AppProvider>
  <PatientDatasetProvider>
    <YourPages />
  </PatientDatasetProvider>
</AppProvider>;

// Any component can access context
function Component() {
  const { showToast } = useContext(AppContext);
  showToast('Patient saved!');
}
```

**Python Analogy** (Flask):

```python
# Provider = app context
with app.app_context():
    g.show_toast = lambda msg: flash(msg)

    # Any view can access
    @app.route('/')
    def index():
        g.show_toast('Patient saved!')
```

---

## Part 9: Debugging Tips

### Browser DevTools

**Console** (like print debugging):

```jsx
console.log('Patient:', patient);
console.error('Error:', error);
console.table(patients); // Pretty table output
```

**React DevTools** (inspect component state):

- Install browser extension
- See component hierarchy
- Inspect props and state

### Common Errors

**"Cannot read property X of undefined"**:

```jsx
// Problem
const name = patient.name.first; // Crashes if patient is null

// Solution: Optional chaining
const name = patient?.name?.first; // Returns undefined if null
```

**"Too many re-renders"**:

```jsx
// Problem: Infinite loop
useEffect(() => {
  setPatient(newPatient); // Triggers re-render → runs effect → infinite loop
});

// Solution: Add dependencies
useEffect(() => {
  setPatient(newPatient);
}, [newPatient]); // Only re-run when newPatient changes
```

---

## Part 10: Quick Reference Cheat Sheet

### File Extensions

- `.jsx` - React components (JavaScript)
- `.tsx` - React components (TypeScript)
- `.ts` - TypeScript utilities
- `.css` - Stylesheets (rarely used with Tailwind)

### Common Imports

```typescript
// React hooks
import { useState, useEffect, useCallback, useMemo } from 'react';

// Next.js navigation
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Medplum
import { useMedplum, useMedplumProfile } from '@medplum/react';

// Our adapters
import { constructLegacyPatientObject } from '@/lib/adapters/legacy-patient-adapter';
```

### TypeScript Quick Escapes

```typescript
// When you don't know the type
const data: any = fetchData();

// Ignore type error
// @ts-ignore
const value = complexObject.deepProperty;

// Disable checking for whole file (last resort)
// @ts-nocheck
```

---

## Conclusion

**Key Takeaways**:

1. React = **Components** (functions that return HTML)
2. State = **Variables that trigger re-render** when changed
3. Next.js = **React framework** with routing and server features
4. TypeScript = **JavaScript + types** (use `any` when stuck)
5. Medplum = **FHIR client** (like ORM for healthcare data)
6. Adapter = **Transform function** (FHIR → Legacy structure)

**You don't need to be an expert** - Claude Code will write most code. You just need to:

- Understand the concepts above
- Know where files go
- Test that pages work
- Copy patterns from existing code

**When stuck**: Ask Claude Code, check browser console, use `console.log()`

**You're ready to start the migration!** 🚀
