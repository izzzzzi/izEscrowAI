# Escrow Contract Compilation

The escrow contract (`escrow.tolk`) must be compiled using izTolkMcp before the bot can deploy contracts.

## Steps

1. Open Claude Code or another MCP-compatible AI assistant with izTolkMcp configured
2. Ask the assistant to compile `contracts/escrow.tolk`
3. Save the resulting BOC hex to `contracts/compiled/escrow.hex`
4. The bot will auto-load this file on startup

## Manual alternative

If you have the Tolk compiler installed directly:

```bash
tolk-compiler contracts/escrow.tolk -o contracts/compiled/escrow.boc
# Then convert to hex:
xxd -p contracts/compiled/escrow.boc | tr -d '\n' > contracts/compiled/escrow.hex
```
