import request, { Response as SuperTestResponse } from 'supertest';
import { Application } from 'express';

import db from 'api/utils/testing_db';

import { setUpApp } from 'api/utils/testingRoutes';
import instanceElasticTesting from 'api/utils/elastic_testing';
import { instanceSearch } from 'api/search/search';
import searchRoutes from 'api/search/routes.ts';
import { testingTenants } from 'api/utils/testingTenants';

import { fixtures, ids, fixturesTimeOut } from './fixtures_elastic';

const elasticIndex = 'search_lookup_index_test';
const search = instanceSearch(elasticIndex);
const elasticTesting = instanceElasticTesting(elasticIndex, search);

describe('Search routes', () => {
  const app: Application = setUpApp(searchRoutes);

  beforeAll(async () => {
    //@ts-ignore
    await db.clearAllAndLoad(fixtures);
    await elasticTesting.reindex();
    testingTenants.changeCurrentTenant({ indexName: elasticIndex });
  }, fixturesTimeOut);

  afterAll(async () => db.disconnect());

  describe('GET /search/lookup', () => {
    it('should return a list of entity options', async () => {
      const res: SuperTestResponse = await request(app)
        .get('/api/search/lookup')
        .query({ searchTerm: 'bat' });

      expect(res.body.options.length).toBe(2);
      expect(res.body.options[0].label).toBeDefined();
      expect(res.body.options[0].template).toBeDefined();
      expect(res.body.options[0].value).toBeDefined();
      expect(res.body.options.find((o: any) => o.label.includes('finishes')).label).toBe(
        'Batman finishes en'
      );
      expect(res.body.options.find((o: any) => o.label.includes('begins')).label).toBe(
        'Batman begins en'
      );
      expect(res.body.count).toBe(2);
    });

    it('should filter by template', async () => {
      let res: SuperTestResponse = await request(app)
        .get('/api/search/lookup')
        .query({ searchTerm: 'en', templates: '[]' });
      expect(res.body.options.length).toBe(4);

      res = await request(app)
        .get('/api/search/lookup')
        .query({ searchTerm: 'en', templates: JSON.stringify([ids.template1]) });

      expect(res.body.options.length).toBe(3);
      expect(res.body.count).toBe(3);
    });

    it('should filter by unpublished', async () => {
      let res: SuperTestResponse = await request(app)
        .get('/api/search/lookup')
        .set('content-language', 'es')
        .query({ searchTerm: 'unpublished' });
      expect(res.body.options.length).toBe(0);

      res = await request(app)
        .get('/api/search/lookup')
        .set('content-language', 'es')
        .query({ searchTerm: 'unpublished', unpublished: true });

      expect(res.body.options.length).toBe(1);
    });
  });

  describe('GET /search/lookupaggregation', () => {
    it('should return a list of options matching by label and options related to the matching one', async () => {
      const query = {
        types: [ids.template1],
        filters: {},
      };

      const res = await request(app)
        .get('/api/search/lookupaggregation')
        .query({ query: JSON.stringify(query), searchTerm: 'Bat', property: 'relationship' });

      const { options } = res.body;

      expect(options.length).toBe(1);
      expect(options[0].value).toBeDefined();
      expect(options[0].label).toBeDefined();
      expect(options[0].results).toBeDefined();
    });
  });

  describe('GET /search/count', () => {
    it('should return the count matching the query passed', async () => {
      let res = await request(app)
        .get('/api/search/count')
        .query({});

      expect(res.body.data).toBe(13);

      res = await request(app)
        .get('/api/search/count')
        .query({ searchTerm: 'Batman' });

      expect(res.body.data).toBe(2);
    });
  });
});
