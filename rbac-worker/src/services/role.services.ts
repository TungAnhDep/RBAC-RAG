export const getRolesService = async (db: D1Database) => {
	const roles = await db.prepare('SELECT id, name FROM Roles').all();
	return roles.results;
};
