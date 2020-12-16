import { Application } from 'express';
import search from 'api/search/search';
import { parseQuery, validation } from 'api/utils';
import { searchSchema } from './searchSchema';

export default (app: Application) => {
  app.get('/api/search/lookup', (req, res, next) => {
    const { query } = req;
    const templates: [] = query.templates ? JSON.parse(query.templates) : [];
    search
      .autocomplete(query.searchTerm, req.language, templates, query.unpublished || false)
      .then(response => res.json(response))
      .catch(next);
  });

  app.get('/api/search/lookupaggregation', (req, res, next) => {
    const query = JSON.parse(req.query.query);
    search
      .autocompleteAggregations(
        query,
        req.language,
        req.query.property,
        req.query.searchTerm,
        req.user
      )
      .then(response => res.json(response))
      .catch(next);
  });

  app.get(
    '/api/search/count',
    parseQuery,
    validation.validateRequest(searchSchema),

    (req, res, next) => {
      search
        .count(req.query, req.language, req.user)
        .then(result => res.json({ data: result }))
        .catch(next);
    }
  );
};
