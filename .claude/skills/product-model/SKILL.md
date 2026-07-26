---
name: product-model
description: What Dock is, the domain vocabulary (space, syllabus, lesson, topic card, learn mode), and what is deliberately out of scope. Load before adding a feature, writing user-facing copy, or naming a model, route or table.
---

# Product model

Dock is a **revision workspace**. A student creates a space **for one lesson**,
shares that lesson and the syllabus section it covers, and the space lays the
lesson's topics out as cards on a grid canvas they can open to learn from.

Spaces are **lesson-scoped, not subject-scoped**. One lesson, one space, one
canvas. A subject is simply the set of spaces a student has made for it — it is
not a container in the product.

## Vocabulary — use these exact words

| Term | Meaning |
| --- | --- |
| **Space** | Container for **one lesson**. Owns that lesson, its syllabus section, its topics and the canvas layout. |
| **Lesson** | The teaching content a space is built around. One lesson per space, shared when the space is created. |
| **Syllabus** | The scope the lesson sits inside: the syllabus section and the depth expected. Shared alongside the lesson. |
| **Topic** | A single thing to learn *within that lesson*, derived from the lesson and its syllabus section. |
| **Topic card** | A topic as it appears on the canvas: title, syllabus reference, revision progress, video count. |
| **Canvas** | The grid-backed surface a space opens as. Cards are positioned on it and the layout persists. |
| **Learn mode** | What opens on clicking a card: chat scoped to that one topic. |
| **Video shelf** | The YouTube explainers matched to a single topic, inside the card. |

Say "share a lesson", not "upload". Say "space", never "workspace", "board" or
"project". Say "topic card", never "node" or "tile". Never describe a space as
covering a subject, a course or an exam — it covers one lesson.

## How the pieces relate

```
User ──< Space (one lesson + its syllabus section)
             └──< Topic ──< ChatMessage
                       └──< Video
```

The lesson and its syllabus section define the topics. Chat and videos hang off a
single topic — never off a space as a whole. That scoping is the whole point of the
product: a card's conversation knows one topic of one lesson, at the depth the
syllabus asks for.

## Bringing your own model

Learn-mode chat runs on the user's **own** AI provider key. On the API-key page a
user pastes a Gemini key and picks a model; both are stored on their account. The
key is required before any chat call, and the product prompts for it rather than
shipping a shared key. The key is never shown back — the app only exposes whether
one is set. Provider details live in the `backend-fastapi` skill.

## Deliberately out of scope

Do not add these, and do not write copy implying them:

- **File uploads of any kind** — no PDF, no slide decks, no attachments. Syllabus
  and lessons come in as text the user shares.
- **Assignments, homework, past papers or grading.** Dock is for revising, not for
  submitting work.
- Collaboration, sharing spaces, classrooms, or anything multi-user.
- Payments, plans and pricing pages. Early access is free.

If a request seems to need one of these, raise it before building it.

## Build order

1. **Foundation** — done. Marketing site (landing, features, about), auth
   (register, login, session), Next.js + FastAPI base.
2. **Spaces and canvas (current)** — a space can be created for a lesson with the
   topics it covers, and listed as cards. The canvas itself is built as UI at
   `/space/<lesson-name>-<id>`, but it renders placeholder content: topic
   extraction from the lesson and a persisted card layout are still to come.
3. **Learn mode and videos** — per-topic chat grounded in the shared lesson, and
   the per-topic video shelf. The shape is in the data (`TopicSession`,
   `youtube_links`) and previewed in the UI; neither is wired to a model yet.

Anything on the marketing pages describing stage 2 or 3 is a promise, not a claim
about what ships today. `/about` states the roadmap honestly — keep it that way.
The same rule holds inside the product: the canvas preview says it is a preview,
and the learn-mode composer is disabled rather than pretending to send.

## Copy voice

Plain, concrete, second person. Short sentences. No exclamation marks, no "AI-powered",
no "revolutionise", no growth-hack urgency. Describe what the product does for one
student the night before an exam.

On **marketing pages**, avoid the internal word "canvas" — visitors don't parse it.
Describe it instead ("a grid of cards", "topic cards"). "Canvas" stays the term in
code and in this vocabulary, just not in front of prospective users.
