# Superpowers Workflow (Claude Code)

When running as **Claude Code (CLI)**, you have access to a skill system via the `Skill` tool. These skills provide specialized workflows for common engineering tasks and **MUST be used** when applicable.

---

## The Core Rule

> **Invoke relevant skills BEFORE any response or action.** Even a 1% chance a skill applies means you MUST invoke it first. This is not optional and cannot be skipped.

---

## Mandatory Skills by Situation

| Situation | Skill to invoke |
|---|---|
| Starting any conversation | `superpowers:using-superpowers` |
| Creating features, components, or new behavior | `superpowers:brainstorming` |
| Writing implementation code (features or bugfixes) | `superpowers:test-driven-development` |
| Encountering a bug, test failure, or unexpected behavior | `superpowers:systematic-debugging` |
| Planning a multi-step task | `superpowers:writing-plans` |
| Executing a written implementation plan | `superpowers:executing-plans` |
| 2+ independent tasks that can run in parallel | `superpowers:dispatching-parallel-agents` |
| Completing or claiming work is done | `superpowers:verification-before-completion` |
| After completing a major feature | `superpowers:requesting-code-review` |
| Receiving code review feedback | `superpowers:receiving-code-review` |

---

## Red Flags (Rationalizations to Avoid)

These thoughts mean **STOP** — you are rationalizing skipping a skill:

- "This is just a simple change" → Still check for skills
- "I need more context first" → Skill check comes BEFORE exploring
- "Let me just read the file quickly" → Skills tell you HOW to approach
- "The skill is overkill for this" → If a skill exists, use it

---

## How to Invoke a Skill

Use the `Skill` tool with the skill name:

```
Skill: "superpowers:brainstorming"
Skill: "superpowers:test-driven-development"
Skill: "superpowers:systematic-debugging"
```

The skill content will be loaded and you MUST follow it directly.

---

## Skill Priority Order

When multiple skills could apply:

1. **Process skills first** — `brainstorming`, `systematic-debugging`, `writing-plans`
2. **Implementation skills second** — `test-driven-development`, `executing-plans`

Example: "Build feature X" → `brainstorming` first, then `test-driven-development`.

---

## Full Skill List

Run `superpowers:using-superpowers` to get the authoritative and up-to-date list of all available skills.
