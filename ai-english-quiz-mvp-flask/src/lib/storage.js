const KEY_USERS = "aiq_users_v1";
const KEY_SESSION = "aiq_session_v1";
const KEY_TESTS = "aiq_tests_v1";

export function seedIfEmpty() {
  const users = JSON.parse(localStorage.getItem(KEY_USERS) || "[]");
  if (users.length) return;

  const seed = [
    { id: 1, name: "Teacher", email: "teacher@test.com", password: "1234", role: "teacher" },
    { id: 2, name: "Student", email: "student@test.com", password: "1234", role: "student" },
  ];
  localStorage.setItem(KEY_USERS, JSON.stringify(seed));
  localStorage.setItem(KEY_TESTS, JSON.stringify([]));
}

export function getSessionUser() {
  try { return JSON.parse(localStorage.getItem(KEY_SESSION) || "null"); }
  catch { return null; }
}

export function logout() {
  localStorage.removeItem(KEY_SESSION);
}

export function login(email, password) {
  const users = JSON.parse(localStorage.getItem(KEY_USERS) || "[]");
  const u = users.find(x => (x.email || "").toLowerCase() === String(email).toLowerCase() && x.password === String(password));
  if (!u) return null;
  const session = { id: u.id, name: u.name, email: u.email, role: u.role };
  localStorage.setItem(KEY_SESSION, JSON.stringify(session));
  return session;
}

export function registerUser({ name, email, password, role }) {
  const users = JSON.parse(localStorage.getItem(KEY_USERS) || "[]");
  if (users.some(u => (u.email || "").toLowerCase() === String(email).toLowerCase())) {
    return { ok: false, message: "Email already exists" };
  }
  const id = Date.now();
  const u = { id, name, email, password, role };
  users.push(u);
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
  return { ok: true };
}

/* Tests CRUD */
export function getTests() {
  try { return JSON.parse(localStorage.getItem(KEY_TESTS) || "[]"); }
  catch { return []; }
}

export function saveTests(tests) {
  localStorage.setItem(KEY_TESTS, JSON.stringify(Array.isArray(tests) ? tests : []));
}

export function nextTestId() {
  return Date.now();
}

export function upsertTest(test) {
  const tests = getTests();
  const idx = tests.findIndex(t => Number(t.id) === Number(test.id));
  if (idx >= 0) tests[idx] = test;
  else tests.unshift(test);
  saveTests(tests);
}

export function deleteTest(id) {
  const tests = getTests().filter(t => Number(t.id) !== Number(id));
  saveTests(tests);
}

export function nextQuestionId(test) {
  const maxId = Math.max(0, ...(test.questions || []).map(q => Number(q.id) || 0));
  return maxId + 1;
}
