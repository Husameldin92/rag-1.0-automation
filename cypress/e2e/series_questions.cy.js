import { testSeries1 } from './tests/seriesTest/test_series_1'
import { testSeries2 } from './tests/seriesTest/test_series_2'
import { testSeries3 } from './tests/seriesTest/test_series_3'
import { testSeries4 } from './tests/seriesTest/test_series_4'

describe('Series Questions Test Suite', () => {
  it('APICon London', () => {
    testSeries1();
  });
  
  it('APICon New York', () => {
    testSeries2();
  });
  
  it('BASTA! Herbst', () => {
    testSeries3();
  });
  
  it.only('BASTA! Spring', () => {
    testSeries4();
  });
});