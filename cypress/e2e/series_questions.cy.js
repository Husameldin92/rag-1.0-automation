import { testSeries1 } from './tests/seriesTest/test_series_1'
import { testSeries2 } from './tests/seriesTest/test_series_2'

describe('Series Questions Test Suite', () => {
  it('APICon London', () => {
    testSeries1();
  });
  
  it.only('APICon New York', () => {
    testSeries2();
  });
});