const Joi = require("@hapi/joi");
const Boom = require("@hapi/boom");

module.exports = {
  method: "POST",
  path: "/tilesets/{qId}/{hash}/{z}/{x}/{y}.pbf",
  options: {
    description: "Returns the tileset in pbf format",
    tags: ["api"],
    cors: true,
    validate: {
      params: {
        qId: Joi.string().required(),
        hash: Joi.string().required(),
        z: Joi.number().required(),
        x: Joi.number().required(),
        y: Joi.number().required()
      },
      options: {
        allowUnknown: true
      }
    },
    handler: async (request, h) => {
      try {
        const item = request.payload.item;
        const qId = request.params.qId;
        const z = request.params.z;
        const x = request.params.x;
        const y = request.params.y;
        const tile = await request.server.methods.getTilesetTile(
          item,
          qId,
          z,
          x,
          y
        );

        return h
          .response(tile)
          .type("application/x-protobuf")
          .header("Content-Encoding", "gzip")
          .header(
            "cache-control",
            "max-age=31536000, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=31536000, immutable"
          );
      } catch (error) {
        return Boom.notFound();
      }
    }
  }
};