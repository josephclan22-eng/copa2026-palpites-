import { dbGet, dbSet, hashPassword, ok, fail, parseBody } from './_db.js';

export default async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { adminName, targetName, newPassword } = await parseBody(req);
  if (!adminName || !targetName || !newPassword || newPassword.length < 3)
    return fail(res, 400, { success: false, error: 'Dados inválidos. Senha deve ter no mínimo 3 caracteres' });

  const users = await dbGet('users');
  const admin = users[adminName];
  if (!admin || !admin.isAdmin)
    return fail(res, 403, { success: false, error: 'Apenas administradores podem redefinir senhas' });
  if (!users[targetName])
    return fail(res, 404, { success: false, error: 'Usuário não encontrado' });

  users[targetName].password = hashPassword(newPassword);
  await dbSet('users', users);
  ok(res, { success: true, message: `Senha de ${targetName} redefinida com sucesso` });
};
