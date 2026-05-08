# constraints

## safety
No Unauthorized Execution — Critical actions cannot run without approval.
No Financial Risk Escalation — Risk cannot increase beyond defined limits.
No Unverified Trades — Trades require validated conditions.
No Silent Failures — All failures must be reported.

## data
No Missing Data — Actions cannot proceed with incomplete inputs.
No Corrupted Inputs — Invalid data must be rejected.
No Inconsistent State — System must maintain data integrity.
No Hidden Modifications — Data changes must be logged.

## execution
No Multi-Action Commands — Commands must perform one action only.
No Recursive Loops — System must avoid infinite execution cycles.
No Unbounded Operations — All actions must have limits.
No Uncontrolled Automation — Automation must follow defined rules.
No Git Actions By Default — Do not use git for add, commit, push, branch, merge, reset, or similar workflow changes unless Ethan explicitly asks in the current chat.

## ai_behavior
No Assumptions — AI must not infer missing critical data.
No Overconfidence — AI must express uncertainty when needed.
No Blind Decisions — AI must include reasoning with actions.
No Direct Control — AI cannot execute critical actions without approval.

## security
No Key Exposure — API keys must never be exposed.
No Permission Escalation — Access levels cannot be bypassed.
No External Injection — Inputs must be sanitized.
No Unsafe Access — Restricted systems require verification.

## system_integrity
No State Drift — System must remain consistent over time.
No Untracked Actions — Every action must be logged.
No Hidden Processes — Background tasks must be visible.
No Unverified Updates — Changes must be confirmed.

## user_control
User Override — User can stop any operation at any time.
User Authority — Final decision always belongs to the user.
User Visibility — User can view all system actions.
User Protection — System must prioritize user safety.