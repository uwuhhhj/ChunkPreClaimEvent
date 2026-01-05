(() => {
  const app = (window.ChunkPreClaimEvent = window.ChunkPreClaimEvent || {});
  app.utils = app.utils || {};

  app.utils.key = (x, z) => `${x},${z}`;

  app.utils.parseKey = (k) => {
    const [x, z] = k.split(",").map(Number);
    return { x, z };
  };

  app.utils.neighbors4 = (x, z) => [
    { x: x + 1, z },
    { x: x - 1, z },
    { x, z: z + 1 },
    { x, z: z - 1 },
  ];
})();
