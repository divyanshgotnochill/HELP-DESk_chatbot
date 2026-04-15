import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HelpDesk backend running on http://localhost:${PORT}`);
});
