import {convertSuccessResponse, convertToApiQuery} from '../../js/component_data/default';
import {httpTrace, skewedTrace} from '../component_ui/traceTestHelpers';
import queryString from 'query-string';

describe('convertSuccessResponse', () => {
  const apiURL = '/api/v2/traces?spanName=all&endTs=1459169770000';

  it('should convert an http trace', () => {
    const expectedTemplate = {
      traceId: 'bb1f0e21882325b8',
      startTs: '11-02-2018T05:56:09.255+0000',
      timestamp: 1541138169255688,
      duration: 168.731,
      durationStr: '168.731ms',
      width: 100,
      totalSpans: 2,
      serviceDurations: [
        {name: 'backend', count: 1, max: 111},
        {name: 'frontend', count: 2, max: 168}
      ],
      infoClass: ''
    };

    const rawResponse = [httpTrace];
    convertSuccessResponse(rawResponse, apiURL, true).should.deep.equal(
      {traces: [expectedTemplate], apiURL, rawResponse}
    );
  });

  it('should skip an empty result', () => {
    convertSuccessResponse([], apiURL, true).should.deep.equal(
      {traces: [], apiURL, rawResponse: []}
    );
  });

  it('should skip an invalid trace', () => {
    const missingTimestamp = [{
      traceId: '2',
      id: '2',
      duration: 1,
      localEndpoint: {serviceName: 'B'}
    }];

    const rawResponse = [missingTimestamp];
    convertSuccessResponse(rawResponse, apiURL, true).should.deep.equal(
      {traces: [], apiURL, rawResponse}
    );
  });

  // This tests that clock skew is considered when deciding the length of the trace
  it('should convert a skewed trace', () => {
    // TODO: This test only ensures the behavior of the existing code. For example, if we don't
    // clock skew correct, the result will be a different duration. We haven't verified the logic
    // is correct.. for example, the calculated duration here may be wrong.
    const expectedTemplate = {
      traceId: '1e223ff1f80f1c69',
      startTs: '08-02-2016T15:00:04.071+0000',
      timestamp: 1470150004071068,
      duration: 99.411,
      durationStr: '99.411ms',
      width: 100,
      totalSpans: 3,
      serviceDurations: [
        {name: 'servicea', count: 2, max: 99},
        {name: 'serviceb', count: 2, max: 94}
      ],
      infoClass: ''
    };

    const rawResponse = [skewedTrace];
    convertSuccessResponse(rawResponse, apiURL, true).should.deep.equal(
      {traces: [expectedTemplate], apiURL, rawResponse}
    );
  });
});

describe('convertToApiQuery', () => {
  const should = require('chai').should();
  it('should clear spanName all', () => {
    const parsed = convertToApiQuery(queryString.parse('?spanName=all&endTs=1459169770000'));

    should.not.exist(parsed.spanName);
  });

  it('should clear serviceName all', () => {
    const parsed = convertToApiQuery(queryString.parse('?serviceName=all&endTs=1459169770000'));

    should.not.exist(parsed.spanName);
  });

  it('should not require startTs', () => {
    const parsed = convertToApiQuery(queryString.parse('?lookback=custom&endTs=1459169770000'));

    parsed.endTs.should.equal('1459169770000');
    should.not.exist(parsed.lookback);
    should.not.exist(parsed.startTs);
  });

  it('should replace startTs with lookback', () => {
    const parsed = convertToApiQuery(
      queryString.parse('?lookback=custom&startTs=1459169760000&endTs=1459169770000')
    );

    parsed.endTs.should.equal('1459169770000');
    parsed.lookback.should.equal('10000');
    should.not.exist(parsed.startTs);
  });

  it('should not add negative lookback', () => {
    const parsed = convertToApiQuery(
      queryString.parse('?lookback=custom&endTs=1459169760000&startTs=1459169770000')
    );

    should.not.exist(parsed.lookback);
    should.not.exist(parsed.startTs);
  });
});
