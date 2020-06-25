import { GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLList, GraphQLFloat, GraphQLInt } from 'graphql';
import { BBox, Feature, Polygon, Geometry } from '@turf/helpers';
import bboxf from '@turf/bbox';
import axios from 'axios';
import proj4 from 'proj4';
import { GeometryObject } from '../geojson';

const PLANS_URLS = [
  'https://services.arcgis.com/quVN97tn06YNGj9s/ArcGIS/rest/services/TSP_Area_Plans_Map5_WFL1/FeatureServer/0',
  'https://services.arcgis.com/quVN97tn06YNGj9s/ArcGIS/rest/services/TSP_Area_Plans_Map5_WFL1/FeatureServer/1',
  'https://services.arcgis.com/quVN97tn06YNGj9s/ArcGIS/rest/services/TSP_Area_Plans_Map5_WFL1/FeatureServer/2'
];

export type AreaPlan = {
  id: string;
  name: string;
  manager: string;
  requirements: string;
  adopted: string;
  document: string;
  geometry: Geometry;
  bbox: BBox;
};

/**
 * Helper function to get a streets within a bounding box.
 */
export async function getAreaPlansByBBox(bbox: BBox, spatialReference: number): Promise<AreaPlan[] | null> {
  if (spatialReference != 4326) {
    [bbox[0], bbox[1]] = proj4(`${spatialReference}`, 'EPSG:4326', [bbox[0], bbox[1]]);
    [bbox[2], bbox[3]] = proj4(`${spatialReference}`, 'EPSG:4326', [bbox[2], bbox[3]]);
  }

  const plans = new Array<AreaPlan>();

  const promises = PLANS_URLS.map(async url => {
    const res = await axios
      .get(`${url}/query`, {
        params: {
          f: 'geojson',
          geometryType: 'esriGeometryEnvelope',
          geometry: bbox.join(','),
          spatialRel: 'esriSpatialRelIntersects',
          inSR: '4326',
          outSR: '4326',
          outFields: '*'
        }
      })
      .catch((err: any) => {
        throw new Error(err);
      });

    if (res.status == 200 && res.data && res.data.features) {
      const data: Feature<Geometry>[] = res.data.features;

      plans.push(
        ...data.reduce((prev, feature) => {
          if (feature.properties) {
            prev.push({
              id: feature.properties.OBJECTID,
              name: feature.properties.Project_Name,
              manager: feature.properties.Project_Manager,
              requirements: feature.properties.Development_Requirements,
              adopted: feature.properties.Adopted,
              document: feature.properties.HyperLink,
              geometry: feature.geometry,
              bbox: bboxf(feature)
            });
          }
          return prev;
        }, new Array<AreaPlan>())
      );
    }
  });

  await Promise.all(promises);

  return plans;
}

/**
 * Helper function to get a streets within a bounding box.
 */
export async function getAreaPlansById(id: number): Promise<AreaPlan[] | null> {
  const plans = new Array<AreaPlan>();

  const promises = PLANS_URLS.map(async url => {
    const res = await axios
      .get(`${url}/query`, {
        params: {
          f: 'geojson',
          where: `OBJECTID=${id}`,
          inSR: '4326',
          outSR: '4326',
          outFields: '*'
        }
      })
      .catch((err: any) => {
        throw new Error(err);
      });

    if (res.status == 200 && res.data && res.data.features) {
      const data: Feature<Geometry>[] = res.data.features;

      plans.push(
        ...data.reduce((prev, feature) => {
          if (feature.properties) {
            prev.push({
              id: feature.properties.OBJECTID,
              name: feature.properties.Project_Name,
              manager: feature.properties.Project_Manager,
              requirements: feature.properties.Development_Requirements,
              adopted: feature.properties.Adopted,
              document: feature.properties.HyperLink,
              geometry: feature.geometry,
              bbox: bboxf(feature)
            });
          }
          return prev;
        }, new Array<AreaPlan>())
      );
    }
  });

  await Promise.all(promises);

  return plans;
}

export const areaPlanType: GraphQLObjectType = new GraphQLObjectType({
  name: 'AreaPlan',
  description: "A documented plan for a section of Portland's streets",
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'An integer identifer for the plan.'
    },
    name: {
      type: GraphQLNonNull(GraphQLString),
      description: 'A machine name for the plan'
    },
    manager: {
      type: GraphQLString,
      description: 'The manager'
    },
    requirements: {
      type: GraphQLString,
      description: 'A reference to requirements for this area plan to be implemented'
    },
    adopted: {
      type: GraphQLString,
      description: 'The year in which this plan was adopted'
    },
    document: {
      type: GraphQLString,
      description: 'A URL for viewing a document associated with the plan'
    },
    geometry: {
      type: GeometryObject,
      description: 'The GeoJSON object representing the project'
    },
    bbox: {
      type: GraphQLList(GraphQLFloat),
      description: 'The bounding box of the plan, in ESPG:4326'
    }
  })
});
