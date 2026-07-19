const { db, ref, get, push, set, update, remove } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const sitesRef = ref(db, 'sites');
    const snapshot = await get(sitesRef);
    if (!snapshot.exists()) return res.json([]);
    const sites = Object.values(snapshot.val());
    sites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, repositoryUrl } = req.body;
    if (!name) return res.status(400).json({ error: 'Site name is required' });

    const sitesRef = ref(db, 'sites');
    const snapshot = await get(sitesRef);
    if (snapshot.exists()) {
      const existing = Object.values(snapshot.val()).find(
        (s) => s.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) return res.status(400).json({ error: 'Site with this name already exists' });
    }

    const newSiteRef = push(sitesRef);
    const site = {
      id: newSiteRef.key,
      name,
      description: description || '',
      repositoryUrl: repositoryUrl || '',
      status: 'ACTIVE',
      createdById: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(newSiteRef, site);
    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const siteRef = ref(db, `sites/${req.params.id}`);
    const snapshot = await get(siteRef);
    if (!snapshot.exists()) return res.status(404).json({ error: 'Site not found' });

    const { name, description, repositoryUrl, status } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (repositoryUrl !== undefined) updates.repositoryUrl = repositoryUrl;
    if (status) updates.status = status;

    await update(siteRef, updates);
    const updated = (await get(siteRef)).val();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const siteRef = ref(db, `sites/${req.params.id}`);
    const snapshot = await get(siteRef);
    if (!snapshot.exists()) return res.status(404).json({ error: 'Site not found' });
    await remove(siteRef);
    res.json({ message: 'Site deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
