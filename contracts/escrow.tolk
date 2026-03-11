// izEscrowAI Escrow Smart Contract
// One contract per deal. Stores funds until release/refund/resolve/timeout.

// --- Op-codes ---
const OP_DEPOSIT: int  = 0x1;
const OP_CONFIRM: int  = 0x2;
const OP_CANCEL: int   = 0x3;
const OP_RESOLVE: int  = 0x4;
const OP_TIMEOUT: int  = 0x5;

// --- States ---
const STATE_UNFUNDED: int = 0;
const STATE_FUNDED: int   = 1;
const STATE_COMPLETED: int = 2;
const STATE_CANCELLED: int = 3;
const STATE_RESOLVED: int = 4;

// --- Errors ---
const ERR_UNAUTHORIZED: int     = 401;
const ERR_INVALID_STATE: int    = 402;
const ERR_WRONG_AMOUNT: int     = 403;
const ERR_TIMEOUT_NOT_REACHED: int = 404;
const ERR_ALREADY_FUNDED: int   = 405;

// --- Storage ---
struct EscrowStorage {
    buyer: address;
    seller: address;
    arbiter: address;
    amount: coins;
    timeout: uint32;
    state: uint8;
}

fun loadStorage(): EscrowStorage {
    return EscrowStorage.fromCell(contract.getData());
}

fun saveStorage(s: EscrowStorage) {
    contract.setData(s.toCell());
}

// --- Message structs ---
struct (0x1) DepositMsg { queryId: uint64; }
struct (0x2) ConfirmMsg { queryId: uint64; }
struct (0x3) CancelMsg { queryId: uint64; }
struct (0x4) ResolveMsg { queryId: uint64; sellerPercent: uint8; }
struct (0x5) TimeoutMsg { queryId: uint64; }

// --- Helpers ---

fun sendCoins(dest: address, amount: coins) {
    val msg = createMessage({
        bounce: false,
        value: amount,
        dest: dest,
        body: beginCell().storeUint(0, 32).endCell(),
    });
    msg.send(SEND_MODE_IGNORE_ERRORS);
}

fun sendAllBalance(dest: address) {
    val msg = createMessage({
        bounce: false,
        value: 0,
        dest: dest,
        body: beginCell().storeUint(0, 32).endCell(),
    });
    msg.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_IGNORE_ERRORS);
}

fun returnFunds(dest: address) {
    val msg = createMessage({
        bounce: false,
        value: 0,
        dest: dest,
        body: beginCell().storeUint(0, 32).endCell(),
    });
    msg.send(SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE | SEND_MODE_IGNORE_ERRORS);
}

// --- Main handler ---

fun onInternalMessage(in: InMessage) {
    // Ignore empty messages (deploy)
    if (in.body.remainingBitsCount() < 32) {
        return;
    }

    val op = in.body.loadUint(32);
    var storage = loadStorage();

    if (op == OP_DEPOSIT) {
        // Only buyer can deposit
        assert(in.senderAddress == storage.buyer) throw ERR_UNAUTHORIZED;
        // Must not be already funded
        assert(storage.state == STATE_UNFUNDED) throw ERR_ALREADY_FUNDED;
        // Check amount (with some tolerance for gas fees: incoming value >= deal amount)
        assert(in.valueCoins >= storage.amount) throw ERR_WRONG_AMOUNT;

        storage.state = STATE_FUNDED;
        saveStorage(storage);
        return;
    }

    if (op == OP_CONFIRM) {
        // Only arbiter can confirm (bot sends on behalf of buyer confirmation)
        assert(in.senderAddress == storage.arbiter) throw ERR_UNAUTHORIZED;
        assert(storage.state == STATE_FUNDED) throw ERR_INVALID_STATE;

        storage.state = STATE_COMPLETED;
        saveStorage(storage);
        // Send all balance to seller
        sendAllBalance(storage.seller);
        return;
    }

    if (op == OP_CANCEL) {
        // Only arbiter can cancel
        assert(in.senderAddress == storage.arbiter) throw ERR_UNAUTHORIZED;
        assert(storage.state == STATE_FUNDED) throw ERR_INVALID_STATE;

        storage.state = STATE_CANCELLED;
        saveStorage(storage);
        // Refund buyer
        sendAllBalance(storage.buyer);
        return;
    }

    if (op == OP_RESOLVE) {
        // Only arbiter can resolve disputes
        assert(in.senderAddress == storage.arbiter) throw ERR_UNAUTHORIZED;
        assert(storage.state == STATE_FUNDED) throw ERR_INVALID_STATE;

        in.body.loadUint(64); // skip queryId
        val sellerPercent = in.body.loadUint(8);
        assert(sellerPercent <= 100) throw ERR_INVALID_STATE;

        storage.state = STATE_RESOLVED;
        saveStorage(storage);

        // Calculate split
        val balance = contract.getOriginalBalance();
        // Reserve small amount for storage fees
        val available = balance - ton("0.01");
        val sellerAmount = available * sellerPercent / 100;
        val buyerAmount = available - sellerAmount;

        if (sellerAmount > 0) {
            sendCoins(storage.seller, sellerAmount);
        }
        if (buyerAmount > 0) {
            sendCoins(storage.buyer, buyerAmount);
        }
        return;
    }

    if (op == OP_TIMEOUT) {
        // Permissionless — anyone can trigger after timeout
        assert(storage.state == STATE_FUNDED) throw ERR_INVALID_STATE;
        assert(blockchain.now() >= storage.timeout) throw ERR_TIMEOUT_NOT_REACHED;

        storage.state = STATE_COMPLETED;
        saveStorage(storage);
        // Release to seller
        sendAllBalance(storage.seller);
        return;
    }

    // Unknown op — return funds to sender
    returnFunds(in.senderAddress);
}

// --- Bounced message handler ---

fun onBouncedMessage(in: InMessageBounced) {
    // If a send bounces, we don't revert state — funds stay in contract
    // This is a safety measure; manual intervention via arbiter needed
}

// --- Getters ---

@method_id(100)
fun getDealState(): (int, int, address, address, address, int, int) {
    val s = loadStorage();
    val balance = contract.getOriginalBalance();
    return (s.state, balance, s.buyer, s.seller, s.arbiter, s.amount, s.timeout);
}
