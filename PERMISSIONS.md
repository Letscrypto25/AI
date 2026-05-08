# permissions

## access_levels
Public — Accessible without restrictions.
User — Requires standard user permission.
Admin — Requires elevated control.
System — Restricted to internal operations.

## command_access
Restricted — Requires explicit approval.
Semi-Controlled — Can execute with validation.
Open — Can execute freely within limits.

## agent_permissions
Analyst — Can use analysis and decision commands.
Strategist — Can propose but not execute critical actions.
Executor — Can execute approved commands only.
Monitor — Can trigger alerts but not actions.

## approval_rules
Critical — Requires user approval before execution.
Moderate — Requires validation before execution.
Low — Can execute automatically.

## overrides
User Override — User can stop or modify any action.
System Lock — Prevents execution under unsafe conditions.
Emergency Stop — Immediately halts all operations.