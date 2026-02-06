const assert = require("assert");
const path = require("path");
const { runWithCore } = require("../index");

function createCoreStub(fshDirectory) {
  let failedMessage = null;
  const summaryState = {
    headings: [],
    paragraphs: [],
    tables: [],
    writes: 0,
  };

  const summary = {
    addHeading(text) {
      summaryState.headings.push(text);
      return this;
    },
    addParagraph(text) {
      summaryState.paragraphs.push(text);
      return this;
    },
    addTable(rows) {
      summaryState.tables.push(rows);
      return this;
    },
    async write() {
      summaryState.writes += 1;
    },
  };

  return {
    core: {
      getInput: (name) => (name === "fsh_directory" ? fshDirectory : ""),
      setFailed: (message) => {
        failedMessage = message;
      },
      summary,
    },
    getFailedMessage: () => failedMessage,
    summaryState,
  };
}

async function runCase(fixtureName) {
  const fixturePath = path.join(__dirname, "fixtures", fixtureName);
  const stub = createCoreStub(fixturePath);
  await runWithCore(stub.core);
  return stub;
}

async function testOk() {
  const stub = await runCase("ok");
  assert.strictEqual(stub.getFailedMessage(), null);
  assert.strictEqual(stub.summaryState.tables.length, 1);
  const table = stub.summaryState.tables[0];
  assert.strictEqual(table.length, 4);
}

async function testDuplicateName() {
  const stub = await runCase("duplicate-name");
  const message = stub.getFailedMessage();
  assert.ok(message);
  assert.ok(message.includes("Alias name duplicate"));
  assert.ok(message.includes("tests/fixtures/duplicate-name/subdir/aliases-b.fsh:1"));
  assert.ok(message.includes("tests/fixtures/duplicate-name/aliases-a.fsh:1"));
}

async function testDuplicateUrl() {
  const stub = await runCase("duplicate-url");
  const message = stub.getFailedMessage();
  assert.ok(message);
  assert.ok(message.includes("URL duplicate"));
  assert.ok(message.includes("tests/fixtures/duplicate-url/subdir/aliases-b.fsh:1"));
  assert.ok(message.includes("tests/fixtures/duplicate-url/aliases-a.fsh:1"));
}

async function testProtocolMismatch() {
  const stub = await runCase("protocol-mismatch");
  const message = stub.getFailedMessage();
  assert.ok(message);
  assert.ok(message.includes("Protocol mismatch"));
  assert.ok(message.includes("tests/fixtures/protocol-mismatch/subdir/aliases-b.fsh:1"));
  assert.ok(message.includes("tests/fixtures/protocol-mismatch/aliases-a.fsh:1"));
}

async function runAll() {
  await testOk();
  await testDuplicateName();
  await testDuplicateUrl();
  await testProtocolMismatch();
}

runAll()
  .then(() => {
    console.log("All tests passed.");
  })
  .catch((error) => {
    console.error("Tests failed.");
    console.error(error);
    process.exit(1);
  });
