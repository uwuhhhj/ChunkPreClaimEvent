(() => {
  const app = (window.ChunkPreClaimEvent = window.ChunkPreClaimEvent || {});
  app.state = app.state || {};

  app.state.createInitialState = () => ({
    claimed: new Set(),
    blocked: new Map(),
    available: new Set(),
    viewSize: 10,
    rules: {
      requireTwoAdj: false,
      limitArm: true,
      maxArmLen: 6,
      limitSupport: true,
      supportM: 1,
      supportN: 5,
      limitPA: false,
      maxPA: 3.5,
      limitDiam: false,
      maxDiam: 64,
      limitEndpoints: false,
      maxEndpoints: 64,
      forbidHoles: true,
      limitOuterFill: false,
      minOuterFill: 0.65,
      limitInnerShare: false,
      minInnerShare: 0.2,
    },
    metrics: {
      area: 0,
      perim: 0,
      diam: 0,
      endpoints: 0,
      bounds: null,
      outerFill: 0,
      innerShare: 0,
      maxFilledSquare: 0,
    },
  });
})();
