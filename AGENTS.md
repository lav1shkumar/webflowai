# Repository Instructions

- Make the smallest change that solves the current request.
- Keep logic direct. Do not add wrappers, classes, helpers, or configuration objects unless the current change uses them more than once.
- Prefer TypeScript inference. Do not create a type or interface for one local use; use generated or library types when an explicit type is actually needed.
- Do not add runtime checks without a concrete input or failure they protect against.
- Do not add packages, `server-only`, comments, or scaffolding unless the current task requires them.
- Do not reformat or modify unrelated code.
- For multi-step work, implement only the approved step. State its behavior and affected files before editing, then stop for review after verification.
- Run only checks relevant to the changed code and report their results.
