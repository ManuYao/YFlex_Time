// Ids stables : le futur coaching vocal nommera ses fichiers audio d'après eux.
export const BLOCK_ROLES = [
  { id: 'warmup', label: 'Échauffement', short: 'Échauffement' },
  { id: 'main', label: 'Principal', short: 'Principal' },
  { id: 'strength', label: 'Force', short: 'Force' },
  { id: 'recovery', label: 'Récup', short: 'Récup' },
  { id: 'cooldown', label: 'Retour au calme', short: 'Calme' },
  { id: 'rest', label: 'Repos', short: 'Repos' },
];

const ROLE_IDS = new Set(BLOCK_ROLES.map((r) => r.id));

export const isBlockRole = (id) => typeof id === 'string' && ROLE_IDS.has(id);

export const getBlockRole = (id) => BLOCK_ROLES.find((r) => r.id === id) || null;

export const defaultRoleForType = (type) => (type === 'rest' ? 'rest' : 'main');

const words = (label) =>
  String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// Mots entiers, jamais includes() : « renforcement » n'est pas un bloc de force.
const LABEL_RULES = [
  { role: 'warmup', test: (w) => w.startsWith('echauf') },
  { role: 'cooldown', test: (w) => w === 'calme' },
  { role: 'recovery', test: (w) => w.startsWith('recup') },
  { role: 'strength', test: (w) => w === 'force' || w === 'forces' },
  { role: 'rest', test: (w) => w === 'repos' },
];

export const inferRoleFromLabel = (label) => {
  const list = words(label);
  if (list.length === 0) return null;
  const rule = LABEL_RULES.find((r) => list.some(r.test));
  return rule ? rule.role : null;
};

// Les mix enregistrés avant les rôles n'ont pas de `role` : la déduction tient lieu de migration.
export const resolveBlockRole = (block) => {
  if (!block) return 'main';
  if (isBlockRole(block.role)) return block.role;
  return inferRoleFromLabel(block.label) || defaultRoleForType(block.type);
};
