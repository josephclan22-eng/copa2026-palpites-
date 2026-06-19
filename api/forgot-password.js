import { dbGet, dbSet, hashPassword, ok, fail, parseBody } from './_db.js';

export default async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { email, newPassword } = await parseBody(req);
  if (!email || !newPassword || newPassword.length < 3)
    return fail(res, 400, { success: false, error: 'Email e nova senha obrigatórios (mín 3 caracteres)' });

  const users = await dbGet('users');
  const found = Object.entries(users).find(([, u]) => u.email?.toLowerCase() === email.toLowerCase());

  if (!found)
    return fail(res, 404, { success: false, error: 'Email não encontrado' });

  const [username] = found;
  users[username].password = hashPassword(newPassword);
  await dbSet('users', users);
  ok(res, { success: true, username, message: `Senha redefinida para ${username}` });
};
