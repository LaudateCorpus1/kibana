/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricExpressionParams } from '../types';
import { getElasticsearchMetricQuery } from './metric_query';
import moment from 'moment';

describe("The Metric Threshold Alert's getElasticsearchMetricQuery", () => {
  const expressionParams = {
    metric: 'system.is.a.good.puppy.dog',
    aggType: 'avg',
    timeUnit: 'm',
    timeSize: 1,
  } as MetricExpressionParams;

  const timefield = '@timestamp';
  const groupBy = 'host.doggoname';
  const timeframe = {
    start: moment().subtract(5, 'minutes').valueOf(),
    end: moment().valueOf(),
  };

  describe('when passed no filterQuery', () => {
    const searchBody = getElasticsearchMetricQuery(expressionParams, timefield, timeframe, groupBy);
    test('includes a range filter', () => {
      expect(
        searchBody.query.bool.filter.find((filter) => filter.hasOwnProperty('range'))
      ).toBeTruthy();
    });

    test('includes a metric field filter', () => {
      expect(searchBody.query.bool.filter).toMatchObject(
        expect.arrayContaining([{ exists: { field: 'system.is.a.good.puppy.dog' } }])
      );
    });
  });

  describe('when passed a filterQuery', () => {
    const filterQuery =
      // This is adapted from a real-world query that previously broke alerts
      // We want to make sure it doesn't override any existing filters
      '{"bool":{"filter":[{"bool":{"filter":[{"bool":{"must_not":[{"bool":{"should":[{"query_string":{"query":"bark*","fields":["host.name^1.0"],"type":"best_fields","default_operator":"or","max_determinized_states":10000,"enable_position_increments":true,"fuzziness":"AUTO","fuzzy_prefix_length":0,"fuzzy_max_expansions":50,"phrase_slop":0,"escape":false,"auto_generate_synonyms_phrase_query":true,"fuzzy_transpositions":true,"boost":1}}],"adjust_pure_negative":true,"minimum_should_match":"1","boost":1}}],"adjust_pure_negative":true,"boost":1}},{"bool":{"must_not":[{"bool":{"should":[{"query_string":{"query":"woof*","fields":["host.name^1.0"],"type":"best_fields","default_operator":"or","max_determinized_states":10000,"enable_position_increments":true,"fuzziness":"AUTO","fuzzy_prefix_length":0,"fuzzy_max_expansions":50,"phrase_slop":0,"escape":false,"auto_generate_synonyms_phrase_query":true,"fuzzy_transpositions":true,"boost":1}}],"adjust_pure_negative":true,"minimum_should_match":"1","boost":1}}],"adjust_pure_negative":true,"boost":1}}],"adjust_pure_negative":true,"boost":1}}],"adjust_pure_negative":true,"boost":1}}';

    const searchBody = getElasticsearchMetricQuery(
      expressionParams,
      timefield,
      timeframe,
      groupBy,
      filterQuery
    );
    test('includes a range filter', () => {
      expect(
        searchBody.query.bool.filter.find((filter) => filter.hasOwnProperty('range'))
      ).toBeTruthy();
    });

    test('includes a metric field filter', () => {
      expect(searchBody.query.bool.filter).toMatchObject(
        expect.arrayContaining([{ exists: { field: 'system.is.a.good.puppy.dog' } }])
      );
    });
  });

  describe('when passed a timeframe of 1 hour', () => {
    const testTimeframe = {
      start: moment().subtract(1, 'hour').valueOf(),
      end: moment().valueOf(),
    };
    const searchBodyWithoutGroupBy = getElasticsearchMetricQuery(
      expressionParams,
      timefield,
      testTimeframe
    );
    const searchBodyWithGroupBy = getElasticsearchMetricQuery(
      expressionParams,
      timefield,
      testTimeframe,
      groupBy
    );
    test("generates 1 hour's worth of buckets", () => {
      // @ts-ignore
      expect(searchBodyWithoutGroupBy.aggs.aggregatedIntervals.date_range.ranges.length).toBe(60);
      expect(
        // @ts-ignore
        searchBodyWithGroupBy.aggs.groupings.aggs.aggregatedIntervals.date_range.ranges.length
      ).toBe(60);
    });
  });
});
