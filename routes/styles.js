const Joi = require("@hapi/joi");
const Boom = require("@hapi/boom");
const helpers = require(`${__dirname}/../helpers/helpers.js`);
const resourcesDir = `${__dirname}/../resources/`;
const basicStyle = require(`${resourcesDir}styles/basic/style.json`);

async function getDataUrl(id, item, toolRuntimeConfig, qId) {
  const hash = await helpers.getHash(item, toolRuntimeConfig);
  return `${
    toolRuntimeConfig.toolBaseUrl
  }/tilesets/${hash}/${id}/{z}/{x}/{y}.pbf?appendItemToPayload=${qId}`;
}

async function getStyle(id, item, toolRuntimeConfig, qId) {
  let style = JSON.stringify(basicStyle);
  style = JSON.parse(
    style.replace(/\${access_token}/g, process.env.ACCESS_TOKEN)
  );

  if (style) {
    style.sources.openmaptiles = {
      type: "vector",
      tiles: [`${toolRuntimeConfig.toolBaseUrl}/tiles/${id}/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 18
    };
    for (const [i, geojson] of item.geojsonList.entries()) {
      const dataUrl = await getDataUrl(i, item, toolRuntimeConfig, qId);
      style.sources[`source-${i}`] = {
        type: "vector",
        tiles: [dataUrl],
        minzoom: 0,
        maxzoom: 18
      };

      style.layers.push({
        id: `label-${i}`,
        type: "symbol",
        source: `source-${i}`,
        "source-layer": `source-${i}`,
        layout: {
          "text-field": "{label}",
          "text-size": 13,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-line-height": 1.1,
          "text-offset": [0, -2],
          "text-anchor": ["string", ["get", "labelPosition"], "center"]
        },
        paint: {
          "text-halo-color": "#ffffff",
          "text-halo-width": 4,
          "text-halo-blur": 4
        },
        filter: ["==", "$type", "Point"]
      });

      const firstSymbolLayerIndex = style.layers.findIndex(
        layer => layer.type === "symbol"
      );

      style.layers.splice(firstSymbolLayerIndex, 0, {
        id: `polygon-${i}`,
        type: "fill",
        source: `source-${i}`,
        "source-layer": `source-${i}`,
        paint: {
          "fill-color": ["string", ["get", "fill"], "#c31906"],
          "fill-opacity": ["number", ["get", "fill-opacity"], 0.35]
        },
        filter: ["==", "$type", "Polygon"]
      });

      style.layers.splice(firstSymbolLayerIndex, 0, {
        id: `polygon-outline-${i}`,
        type: "line",
        source: `source-${i}`,
        "source-layer": `source-${i}`,
        paint: {
          "line-color": ["string", ["get", "stroke"], "#c31906"],
          "line-width": ["number", ["get", "stroke-width"], 0],
          "line-opacity": ["number", ["get", "stroke-opacity"], 1]
        },
        filter: ["==", "$type", "Polygon"]
      });

      style.layers.splice(firstSymbolLayerIndex, 0, {
        id: `linestring-${i}`,
        type: "line",
        source: `source-${i}`,
        "source-layer": `source-${i}`,
        paint: {
          "line-color": ["string", ["get", "stroke"], "#c31906"],
          "line-width": ["number", ["get", "stroke-width"], 2],
          "line-opacity": ["number", ["get", "stroke-opacity"], 1]
        },
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        filter: ["==", "$type", "LineString"]
      });

      style.layers.splice(firstSymbolLayerIndex, 0, {
        id: `point-${i}`,
        type: "circle",
        source: `source-${i}`,
        "source-layer": `source-${i}`,
        paint: {
          "circle-radius": 5,
          "circle-color": "#000000",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        },
        filter: ["==", "$type", "Point"]
      });
    }
  }
  return style;
}

module.exports = [
  {
    method: "POST",
    path: "/styles/{id}",
    options: {
      description: "Returns a map style",
      tags: ["api"],
      validate: {
        params: {
          id: Joi.string().required()
        },
        query: {
          toolRuntimeConfig: Joi.object().required(),
          qId: Joi.string().required()
        },
        options: {
          allowUnknown: true
        }
      },
      handler: async (request, h) => {
        const id = request.params.id;
        const item = request.payload.item;
        const toolRuntimeConfig = request.query.toolRuntimeConfig;
        const qId = request.query.qId;

        const style = await getStyle(id, item, toolRuntimeConfig, qId);
        if (style) {
          return h
            .response(style)
            .type("application/json")
            .header(
              "cache-control",
              "max-age=31536000, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=31536000, immutable"
            );
        } else {
          return Boom.notFound();
        }
      }
    }
  }
];
