# Power User Workspace - UI Design System

**Version:** 1.0
**Last Updated:** December 8, 2025
**Target:** VS Code Dark Modern Pixel-Perfect Parity

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Density](#4-spacing--density)
5. [Component Specifications](#5-component-specifications)
6. [Layout System](#6-layout-system)
7. [Icons](#7-icons)
8. [Keyboard Shortcuts](#8-keyboard-shortcuts)
9. [Animation & Transitions](#9-animation--transitions)

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **VS Code Parity**: Match VS Code Dark Modern theme pixel-for-pixel
2. **Information Density**: Maximum data visibility without clutter
3. **Keyboard-First**: Every action accessible via keyboard
4. **Professional Aesthetic**: Muted colors, subtle interactions
5. **Healthcare Adaptation**: VS Code patterns adapted for clinical workflows

### 1.2 Design Goals

- Process 50+ patients visible on screen at once
- Sub-100ms response time for all interactions
- 10-15 seconds per patient decision workflow
- Zero cognitive load from UI chrome

---

## 2. Color System

### 2.1 Background Colors

| Token               | Hex       | Usage                                    |
| ------------------- | --------- | ---------------------------------------- |
| `--pw-bg-primary`   | `#1F1F1F` | Editor/main content background           |
| `--pw-bg-secondary` | `#181818` | Sidebar, activity bar, panels, title bar |
| `--pw-bg-tertiary`  | `#313131` | Inputs, dropdowns, buttons               |
| `--pw-bg-elevated`  | `#252526` | Hover states, elevated panels            |

### 2.2 Text Colors

| Token                 | Hex       | Usage                      |
| --------------------- | --------- | -------------------------- |
| `--pw-text-primary`   | `#CCCCCC` | Main body text             |
| `--pw-text-secondary` | `#9D9D9D` | Muted/secondary text       |
| `--pw-text-tertiary`  | `#6E7681` | Very muted text, disabled  |
| `--pw-text-white`     | `#FFFFFF` | Inverted text, active tabs |

### 2.3 Border Colors

| Token                | Hex       | Usage                          |
| -------------------- | --------- | ------------------------------ |
| `--pw-border`        | `#2B2B2B` | Standard borders               |
| `--pw-border-light`  | `#3C3C3C` | Hover state borders            |
| `--pw-border-accent` | `#0078D4` | Focus state, active indicators |

### 2.4 Accent Colors

| Token               | Hex       | Usage                          |
| ------------------- | --------- | ------------------------------ |
| `--pw-accent`       | `#0078D4` | VS Code blue - primary actions |
| `--pw-accent-hover` | `#026EC1` | Hover state for accent         |
| `--pw-selection`    | `#264F78` | Selection backgrounds          |
| `--pw-link`         | `#3794FF` | Links                          |

### 2.5 Status Colors (Muted Syntax Highlighting)

**CRITICAL**: Use muted syntax colors, NOT bright saturated colors.

| Status  | Hex       | CSS Variable   | Usage                          |
| ------- | --------- | -------------- | ------------------------------ |
| Success | `#4EC9B0` | `--pw-success` | Approve, Pass, Safe, Compliant |
| Warning | `#DCDCAA` | `#DCDCAA`      | At-risk, Flag, Caution         |
| Error   | `#CE9178` | `--pw-error`   | Deny, Fail, Critical, Failing  |
| Info    | `#9CDCFE` | `--pw-info`    | Info, Stable, Pending          |

**Status Background Variants:**

```css
/* Success */
bg: rgba(78, 201, 176, 0.1)
border: rgba(78, 201, 176, 0.3)

/* Warning */
bg: rgba(220, 220, 170, 0.1)
border: rgba(220, 220, 170, 0.3)

/* Error */
bg: rgba(206, 145, 120, 0.1)
border: rgba(206, 145, 120, 0.3)

/* Info */
bg: rgba(156, 220, 254, 0.1)
border: rgba(156, 220, 254, 0.3)
```

### 2.6 Confidence/Risk Color Mapping

| Level                  | Color        | Hex       |
| ---------------------- | ------------ | --------- |
| High (≥90%) / Low Risk | Cyan-Green   | `#4EC9B0` |
| Medium (70-89%)        | Yellow       | `#DCDCAA` |
| Low (<70%) / High Risk | Muted Orange | `#CE9178` |

### 2.7 Component-Specific Colors

#### Title Bar

```css
background: #181818
border-bottom: #2B2B2B
text: #CCCCCC
```

#### Activity Bar

```css
background: #181818
border-right: #2B2B2B
icon-active: #D7D7D7
icon-inactive: #868686
active-border-left: #0078D4
badge-bg: #0078D4
badge-text: #FFFFFF
```

#### Tabs

```css
tab-inactive-bg: #181818
tab-active-bg: #1F1F1F
tab-active-border-top: #0078D4
tab-border: #2B2B2B
tab-active-text: #FFFFFF
tab-inactive-text: #9D9D9D
```

#### Status Bar

```css
background: #181818  /* NOT blue! */
text: #CCCCCC
border-top: #2B2B2B
remote-indicator-bg: #0078D4
remote-indicator-text: #FFFFFF
```

#### Panels (Bottom)

```css
background: #181818
border-top: #2B2B2B
tab-active-text: #CCCCCC
tab-inactive-text: #9D9D9D
tab-active-border-bottom: #0078D4
```

#### Sidebar

```css
background: #181818
border-right: #2B2B2B
section-header-bg: #181818
text: #CCCCCC
```

---

## 3. Typography

### 3.1 Font Stack

```css
font-family:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
  'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

### 3.2 Font Sizes by Density

| Density  | Base Font | Secondary | Row Height | Line Height |
| -------- | --------- | --------- | ---------- | ----------- |
| Compact  | 11px      | 10px      | 20px       | 1.2         |
| Normal   | 12px      | 11px      | 24px       | 1.3         |
| Spacious | 14px      | 13px      | 28px       | 1.4         |

### 3.3 Font Weights

| Weight          | Usage                             |
| --------------- | --------------------------------- |
| 400 (Regular)   | Body text, descriptions           |
| 500 (Medium)    | Labels, headers, important values |
| 600 (Semi-bold) | Section headers, buttons          |

### 3.4 Text Styles

```css
/* Primary Text */
font-size: var(--pw-density-font-size);
color: #cccccc;
font-weight: 400;

/* Secondary Text */
font-size: calc(var(--pw-density-font-size) - 1px);
color: #9d9d9d;
font-weight: 400;

/* Header Text */
font-size: var(--pw-density-font-size);
color: #cccccc;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.05em;

/* Monospace (values, codes) */
font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
```

---

## 4. Spacing & Density

### 4.1 Density CSS Variables

```css
/* Compact */
--pw-density-font-size: 11px;
--pw-density-line-height: 1.2;
--pw-density-padding: 2px;
--pw-density-spacing: 4px;
--pw-density-tab-height: 24px;
--pw-density-row-height: 20px;

/* Normal */
--pw-density-font-size: 12px;
--pw-density-line-height: 1.3;
--pw-density-padding: 4px;
--pw-density-spacing: 6px;
--pw-density-tab-height: 28px;
--pw-density-row-height: 24px;

/* Spacious */
--pw-density-font-size: 14px;
--pw-density-line-height: 1.4;
--pw-density-padding: 6px;
--pw-density-spacing: 8px;
--pw-density-tab-height: 32px;
--pw-density-row-height: 28px;
```

### 4.2 Component Heights

| Component         | Compact | Normal | Spacious |
| ----------------- | ------- | ------ | -------- |
| Title Bar         | 30px    | 30px   | 30px     |
| Tab Bar           | 35px    | 35px   | 35px     |
| Tab               | 24px    | 28px   | 32px     |
| Table Row         | 20px    | 24px   | 28px     |
| Status Bar        | 22px    | 22px   | 22px     |
| Activity Bar Icon | 48px    | 48px   | 48px     |

### 4.3 Panel Widths

| Panel        | Min   | Default | Max   |
| ------------ | ----- | ------- | ----- |
| Activity Bar | 48px  | 48px    | 48px  |
| Sidebar      | 250px | 320px   | 600px |
| Bottom Panel | 150px | 250px   | 500px |

---

## 5. Component Specifications

### 5.1 Buttons

#### Primary Button

```css
background: #0078d4;
color: #ffffff;
border: none;
border-radius: 2px;
padding: 4px 12px;
font-size: 12px;
/* Hover */
background: #026ec1;
```

#### Secondary Button

```css
background: #313131;
color: #cccccc;
border: 1px solid #3c3c3c;
border-radius: 2px;
padding: 4px 12px;
font-size: 12px;
/* Hover */
background: #3c3c3c;
```

#### Icon Button

```css
background: transparent;
color: #9d9d9d;
padding: 4px;
border-radius: 2px;
/* Hover */
background: #3c3c3c;
color: #cccccc;
```

#### Decision Buttons

```css
/* Approve */
background: transparent;
color: #4ec9b0;
border: 1px solid #4EC9B0/30;
/* Hover */
background: #4EC9B0/10;

/* Deny */
background: transparent;
color: #ce9178;
border: 1px solid #CE9178/30;
/* Hover */
background: #CE9178/10;

/* Flag */
background: transparent;
color: #dcdcaa;
border: 1px solid #DCDCAA/30;
/* Hover */
background: #DCDCAA/10;
```

### 5.2 Inputs

#### Text Input

```css
background: #3c3c3c;
border: 1px solid #454545;
border-radius: 2px;
color: #cccccc;
padding: 4px 8px;
font-size: var(--pw-density-font-size);
/* Focus */
border-color: #0078d4;
outline: none;
/* Placeholder */
color: #9d9d9d;
```

#### Search Input

```css
/* Same as text input but with icon */
padding-left: 28px; /* Space for icon */
```

#### Select/Dropdown

```css
background: #3c3c3c;
border: 1px solid #454545;
border-radius: 2px;
color: #cccccc;
padding: 2px 4px;
font-size: var(--pw-density-font-size);
```

### 5.3 Tables

#### Table Container

```css
background: var(--pw-bg-primary);
border: 1px solid #2b2b2b;
overflow: auto;
```

#### Table Header

```css
background: #181818;
border-bottom: 1px solid #2b2b2b;
position: sticky;
top: 0;
z-index: 10;
```

#### Table Header Cell

```css
font-size: calc(var(--pw-density-font-size) - 1px);
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.05em;
color: #9d9d9d;
padding: 0 8px;
height: var(--pw-density-row-height);
```

#### Table Row

```css
height: var(--pw-density-row-height);
border-bottom: 1px solid #2b2b2b;
font-size: var(--pw-density-font-size);
color: #cccccc;
/* Hover */
background: #2a2d2e;
/* Selected */
background: #37373d;
```

#### Table Cell

```css
padding: 0 8px;
line-height: var(--pw-density-line-height);
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

### 5.4 Tabs

#### Tab Bar Container

```css
background: #181818;
border-bottom: 1px solid #2b2b2b;
height: 35px;
display: flex;
overflow-x: auto;
```

#### Tab (Inactive)

```css
background: #181818;
color: #9d9d9d;
border-right: 1px solid #2b2b2b;
padding: 0 12px;
height: var(--pw-density-tab-height);
font-size: 13px;
```

#### Tab (Active)

```css
background: #1f1f1f;
color: #ffffff;
border-top: 2px solid #0078d4;
border-right: 1px solid #2b2b2b;
```

#### Tab Close Button

```css
width: 16px;
height: 16px;
margin-left: 4px;
border-radius: 2px;
color: transparent; /* Hidden until hover */
/* Tab Hover */
color: #9d9d9d;
/* Button Hover */
background: #3c3c3c;
color: #cccccc;
```

### 5.5 Modals/Dialogs

#### Modal Backdrop

```css
background: rgba(0, 0, 0, 0.5);
position: fixed;
inset: 0;
z-index: 50;
```

#### Modal Container

```css
background: #1f1f1f;
border: 1px solid #454545;
border-radius: 6px;
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
max-height: 80vh;
overflow: hidden;
```

#### Modal Header

```css
background: #252526;
border-bottom: 1px solid #454545;
padding: 12px 16px;
```

#### Modal Title

```css
font-size: 14px;
font-weight: 500;
color: #cccccc;
```

#### Modal Body

```css
padding: 16px;
overflow-y: auto;
```

#### Modal Footer

```css
background: #252526;
border-top: 1px solid #454545;
padding: 12px 16px;
display: flex;
justify-content: flex-end;
gap: 8px;
```

### 5.6 Badges/Pills

#### Standard Badge

```css
display: inline-flex;
align-items: center;
padding: 2px 6px;
border-radius: 2px;
font-size: 10px;
font-weight: 500;
```

#### Status Badge

```css
/* Success */
background: rgba(78, 201, 176, 0.1);
color: #4ec9b0;
border: 1px solid rgba(78, 201, 176, 0.3);

/* Warning */
background: rgba(220, 220, 170, 0.1);
color: #dcdcaa;
border: 1px solid rgba(220, 220, 170, 0.3);

/* Error */
background: rgba(206, 145, 120, 0.1);
color: #ce9178;
border: 1px solid rgba(206, 145, 120, 0.3);
```

#### Count Badge (Activity Bar)

```css
background: #0078d4;
color: #ffffff;
font-size: 9px;
min-width: 16px;
height: 16px;
border-radius: 8px;
```

### 5.7 Progress Indicators

#### Progress Bar

```css
/* Container */
background: #3c3c3c;
border-radius: 2px;
height: 4px;
overflow: hidden;

/* Fill */
background: #0078d4;
transition: width 0.3s ease;
```

#### Spinner

```css
border: 2px solid #3c3c3c;
border-top-color: #0078d4;
border-radius: 50%;
animation: spin 1s linear infinite;
```

### 5.8 Tooltips

```css
background: #252526;
border: 1px solid #454545;
border-radius: 2px;
padding: 4px 8px;
font-size: 12px;
color: #cccccc;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
```

---

## 6. Layout System

### 6.1 Main Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                     Title Bar (30px)                     │
├────────┬──────────────────────────────────┬─────────────┤
│        │           Tab Bar (35px)          │             │
│Activity│──────────────────────────────────│   Right     │
│  Bar   │                                  │  Sidebar    │
│ (48px) │         Editor Area              │  (320px)    │
│        │                                  │             │
│        ├──────────────────────────────────┤             │
│        │       Bottom Panel (250px)       │             │
├────────┴──────────────────────────────────┴─────────────┤
│                    Status Bar (22px)                     │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Panel Hierarchy

1. **Title Bar** - Fixed top, always visible
2. **Activity Bar** - Fixed left, collapsible
3. **Primary Sidebar** - Left of editor, resizable
4. **Editor Area** - Center, tabs + content
5. **Secondary Sidebar** - Right of editor, resizable
6. **Bottom Panel** - Below editor, resizable
7. **Status Bar** - Fixed bottom, always visible

### 6.3 Z-Index Scale

| Layer    | Z-Index | Usage                          |
| -------- | ------- | ------------------------------ |
| Base     | 0       | Main content                   |
| Sticky   | 10      | Table headers, sticky elements |
| Dropdown | 20      | Dropdowns, menus               |
| Overlay  | 30      | Panels, sidebars               |
| Modal    | 40      | Modals, dialogs                |
| Toast    | 50      | Toast notifications            |
| Tooltip  | 60      | Tooltips                       |

---

## 7. Icons

### 7.1 Icon Library

Primary: **Heroicons** (Outline variant)

- 24x24px for Activity Bar
- 20x20px for buttons/actions
- 16x16px for inline icons
- 14x14px for table cells
- 12x12px for badges

### 7.2 Icon Colors

| State    | Color     |
| -------- | --------- |
| Default  | `#9D9D9D` |
| Hover    | `#CCCCCC` |
| Active   | `#FFFFFF` |
| Disabled | `#6E7681` |
| Success  | `#4EC9B0` |
| Warning  | `#DCDCAA` |
| Error    | `#CE9178` |

---

## 8. Keyboard Shortcuts

### 8.1 Global Shortcuts

| Shortcut | Action                     |
| -------- | -------------------------- |
| `⌘K`     | Open Command Palette       |
| `⌘P`     | Quick Open (Go to Patient) |
| `⌘⇧O`    | Go to Symbol (Medication)  |
| `⌘⇧H`    | Find & Replace             |
| `⌘,`     | Open Settings              |
| `?`      | Show Keyboard Hints        |
| `⌘K Z`   | Toggle Zen Mode            |

### 8.2 Navigation

| Shortcut | Action              |
| -------- | ------------------- |
| `⌘B`     | Toggle Sidebar      |
| `⌘J`     | Toggle Bottom Panel |
| `⌘\`     | Toggle Split View   |
| `⌘1-9`   | Switch to Tab 1-9   |
| `⌘Tab`   | Next Tab            |
| `⌘⇧Tab`  | Previous Tab        |
| `⌘W`     | Close Tab           |

### 8.3 Selection

| Shortcut | Action               |
| -------- | -------------------- |
| `⌘D`     | Select Next Matching |
| `⌘⇧L`    | Select All Matching  |
| `⌘Click` | Toggle Selection     |
| `⇧Click` | Range Selection      |
| `Esc`    | Clear Selection      |

### 8.4 Actions

| Shortcut | Action                          |
| -------- | ------------------------------- |
| `A`      | Approve (when patient selected) |
| `D`      | Deny (when patient selected)    |
| `F`      | Flag (when patient selected)    |
| `⌘Z`     | Undo                            |
| `⌘⇧Z`    | Redo                            |
| `⌘Enter` | Confirm/Submit                  |

---

## 9. Animation & Transitions

### 9.1 Timing

| Duration | Usage                      |
| -------- | -------------------------- |
| 75ms     | Micro-interactions (hover) |
| 150ms    | Standard transitions       |
| 200ms    | Panel slides               |
| 300ms    | Modal open/close           |
| 500ms    | Long animations            |

### 9.2 Easing

```css
/* Standard */
transition-timing-function: ease;

/* Enter */
transition-timing-function: ease-out;

/* Exit */
transition-timing-function: ease-in;

/* Emphasis */
transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 9.3 Common Transitions

```css
/* Hover states */
transition:
  background-color 75ms ease,
  color 75ms ease;

/* Panel resize */
transition:
  width 200ms ease,
  height 200ms ease;

/* Fade in/out */
transition: opacity 150ms ease;

/* Slide */
transition: transform 200ms ease-out;
```

---

## Appendix A: CSS Variable Reference

```css
:root {
  /* Backgrounds */
  --pw-bg-primary: #1f1f1f;
  --pw-bg-secondary: #181818;
  --pw-bg-tertiary: #313131;
  --pw-bg-elevated: #252526;
  --pw-bg-accent: #0078d4;

  /* Text */
  --pw-text-primary: #cccccc;
  --pw-text-secondary: #9d9d9d;
  --pw-text-tertiary: #6e7681;
  --pw-text-white: #ffffff;

  /* Borders */
  --pw-border: #2b2b2b;
  --pw-border-light: #3c3c3c;
  --pw-border-accent: #0078d4;

  /* Status */
  --pw-success: #4ec9b0;
  --pw-warning: #dcdcaa;
  --pw-error: #ce9178;
  --pw-info: #9cdcfe;

  /* Interactive */
  --pw-hover-bg: #2a2d2e;
  --pw-selected-bg: #37373d;
  --pw-active-bg: #0078d4;

  /* Density (Compact default) */
  --pw-density-font-size: 11px;
  --pw-density-line-height: 1.2;
  --pw-density-padding: 2px;
  --pw-density-spacing: 4px;
  --pw-density-tab-height: 24px;
  --pw-density-row-height: 20px;
}
```

---

_Design System maintained by the Ignite MedRefills team_
