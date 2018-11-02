import {component} from 'flightjs';
import {errToStr} from '../../js/component_ui/error';
import $ from 'jquery';
import queryString from 'query-string';
import {traceSummary, traceSummariesToMustache} from '../component_ui/traceSummary';
import {SPAN_V1} from '../spanConverter';

export function convertToApiQuery(source) {
  const query = Object.assign({}, source);
  // zipkin's api looks back from endTs
  if (query.lookback !== 'custom') {
    delete query.startTs;
    delete query.endTs;
  }
  if (query.startTs) {
    if (query.endTs > query.startTs) {
      query.lookback = String(query.endTs - query.startTs);
    }
    delete query.startTs;
  }
  if (query.lookback === 'custom') {
    delete query.lookback;
  }
  if (query.serviceName === 'all') {
    delete query.serviceName;
  }
  if (query.spanName === 'all') {
    delete query.spanName;
  }
  // delete any parameters unused on the server
  Object.keys(query).forEach(key => {
    if (query[key] === '') {
      delete query[key];
    }
  });
  delete query.sortOrder;
  return query;
}

// Converts the response into data for index.mustache. Traces missing required data are skipped.
export function convertSuccessResponse(rawResponse, apiURL, utc = false) {
  const summaries = [];
  rawResponse.forEach((raw) => {
    const v1Trace = SPAN_V1.convertTrace(raw);
    if (v1Trace.length > 0 && v1Trace[0].timestamp) {
      summaries.push(traceSummary(v1Trace));
    }
  });

  // Take the summaries and convert them to template parameters for index.mustache
  let traces = [];
  if (summaries.length > 0) {
    traces = traceSummariesToMustache(apiURL.serviceName, summaries, utc);
  }
  return {traces, apiURL, rawResponse};
}

export default component(function DefaultData() {
  this.after('initialize', function() {
    const query = queryString.parse(window.location.search);
    if (!query.serviceName) {
      this.trigger('defaultPageModelView', {traces: []});
      return;
    }
    const apiQuery = convertToApiQuery(query);
    const apiURL = `api/v2/traces?${queryString.stringify(apiQuery)}`;
    $.ajax(apiURL, {
      type: 'GET',
      dataType: 'json'
    }).done(rawTraces => {
      this.trigger('defaultPageModelView', convertSuccessResponse(rawTraces, apiURL));
    }).fail(e => {
      this.trigger('defaultPageModelView', {traces: [],
                                            queryError: errToStr(e)});
    });
  });
});
