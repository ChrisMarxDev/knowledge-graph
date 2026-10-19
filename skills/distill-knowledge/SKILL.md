---
name: distill-knowledge
description: At the end of a software task, identify useful lasting project knowledge and briefly ask whether to save it in the project's kw graph. Use for end-of-task knowledge capture; propose before writing.
---

# Distill task knowledge

Before delivering the result of each software task, consider what the task
revealed that could save a future agent or maintainer meaningful investigation.
Use the task's evidence: a settled decision and its reason, a surprising project
constraint, an important relationship, or a verified lesson from debugging.
Distill the useful conclusion, not the sequence of actions taken.

Skip routine changes, temporary status, speculation, secrets, and information
already adequately recorded. Do not invent a lesson to fill a closing section.
When nothing merits capture, deliver the task result without a knowledge note.
Keep this review proportional to the task, not a separate retrospective.

Use [use-kw](../use-kw/SKILL.md) to find the existing collection and inspect the
most relevant nodes before proposing a duplicate. Prefer updating an existing
subject over creating a second account. Follow the project's vocabulary; do not
require a particular template or ontology. If no collection exists, make that
clear and keep setup separate from approval of the proposed knowledge.

When there is a worthwhile candidate, append one short sentence or at most two
bullets to the normal task result. Give the proposed node title, the concrete
knowledge to preserve (including its reason), and whether it is a new node or
an update. Ask for explicit approval, for example:

“Save **Retry ownership** as a knowledge node? The worker owns retries because
retrying in both the worker and client can duplicate deliveries.”

Wait for the user's answer before creating or editing knowledge. Authorization
to perform the software task alone does not authorize this capture. Do not
interpret silence as agreement, repeatedly ask after a refusal, or block delivery
of the completed task while awaiting an answer. If the user already explicitly
approved recording this exact finding, carry out that approval without asking again.

After approval, recheck the relevant existing knowledge, then create or update
only the agreed content using use-kw. Preserve existing IDs, cite available
evidence with sources, and associate relevant implementation paths with files.
Distinguish confirmed facts from inference and preserve historical reasoning
when a decision changes. Run kw doctor, inspect findings, and briefly report
what was recorded with its path. Do not commit automatically.

This skill is an agent workflow, not a CLI hook. Projects can opt into the
end-of-task check through their agent instructions. kw skill install currently
installs only use-kw; it does not install or activate this workflow.
