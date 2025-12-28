const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

mongoose.connect("mongodb://localhost:27017/dailygomanagementdb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixPasswords() {
  const users = await mongoose.connection.db
    .collection("operators")
    .find()
    .toArray();

  for (const user of users) {
    if (
      typeof user.password === "string" &&
      (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))
    ) {
      continue;
    }

    const hashed = await bcrypt.hash(user.password, 10);

    await mongoose.connection.db.collection("operators").updateOne(
      { _id: user._id },
      { $set: { password: hashed } }
    );

    console.log(`✔ Fixed password for ${user.email}`);
  }

  console.log("✅ All passwords fixed");
  process.exit(0);
}

fixPasswords().catch((err) => {
  console.error(err);
  process.exit(1);
});
