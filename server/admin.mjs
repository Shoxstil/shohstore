import { db, hashCode } from "./db.mjs";
import { createInterface } from "node:readline/promises";
const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
try {
  const name =
    process.env.SHOHSTORE_ADMIN_NAME ||
    (await terminal.question("Имя администратора: "));
  let code = process.env.SHOHSTORE_ADMIN_CODE;
  if (!code) {
    terminal.close();
    process.stdout.write("Код доступа (ввод скрыт): ");
    code = await new Promise((resolve, reject) => {
      let value = "";
      if (!process.stdin.isTTY)
        return reject(
          Error("Use SHOHSTORE_ADMIN_CODE in a noninteractive environment"),
        );
      process.stdin.setRawMode(true);
      process.stdin.resume();
      const handler = (b) => {
        for (const c of b.toString()) {
          if (c === "\r" || c === "\n") {
            process.stdin.off("data", handler);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write("\n");
            resolve(value);
            return;
          }
          if (c === "\u0003") process.exit(1);
          if (c === "\u007f") {
            value = value.slice(0, -1);
          } else value += c;
        }
      };
      process.stdin.on("data", handler);
    });
  }
  if (
    name.trim().length < 2 ||
    name.trim().length > 40 ||
    !/^[\p{L}\p{N} '‘’ʻʼ_.-]+$/u.test(name.trim()) ||
    code.length < 6 ||
    code.length > 128
  )
    throw Error("Имя: 2–40 символов; код доступа: 6–128 символов.");
  if (
    db
      .prepare("SELECT id FROM users WHERE name=? COLLATE NOCASE")
      .get(name.trim())
  )
    throw Error("Имя уже занято. Существующие учётные записи не изменены.");
  db.prepare(
    "INSERT INTO users(name,phone,hash,role) VALUES(?,?,?,'admin')",
  ).run(name.trim(), null, hashCode(code));
  console.log(
    "Администратор создан. Войдите на сайте с указанными именем и кодом.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  terminal.close();
  db.close();
}
