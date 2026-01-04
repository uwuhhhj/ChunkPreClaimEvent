export const key = (x, z) => `${x},${z}`;

export const parseKey = (k) => {
  const [x, z] = k.split(",").map(Number);
  return { x, z };
};

export function neighbors4(x, z) {
  return [
    { x: x + 1, z },
    { x: x - 1, z },
    { x, z: z + 1 },
    { x, z: z - 1 },
  ];
}

