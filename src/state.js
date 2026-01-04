export function createInitialState() {
  return {
    claimed: new Set(),
    blocked: new Set(),
    viewSize: 31,
    options: {
      showCoord: false,
      autoAvailOnly: true,
    },
    rules: {
      requireTwoAdj: false,
      limitArm: true,
      maxArmLen: 6,
      limitPA: false,
      maxPA: 3.5,
      limitEndpoints: false,
      maxEndpoints: 64,
      forbidHoles: false,
      limitOuterFill: false,
      minOuterFill: 0.65,
      limitInnerShare: false,
      minInnerShare: 0.2,
    },
    metrics: {
      area: 0,
      perim: 0,
      endpoints: 0,
      bounds: null,
      outerFill: 0,
      innerShare: 0,
      maxFilledSquare: 0,
    },
  };
}

