import { testSeries1 } from './tests/seriesTest/test_series_1'
import { testSeries2 } from './tests/seriesTest/test_series_2'
import { testSeries3 } from './tests/seriesTest/test_series_3'
import { testSeries4 } from './tests/seriesTest/test_series_4'
import { testSeries5 } from './tests/seriesTest/test_series_5'
import { testSeries6 } from './tests/seriesTest/test_series_6'
import { testSeries7 } from './tests/seriesTest/test_series_7'

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
  
  it('BASTA! Spring', () => {
    testSeries4();
  });
  
  it('Delphi Code Camp Duesseldorf', () => {
    testSeries5();
  });
  
  it('DevOps Training Docker', () => {
    testSeries6();
  });
  
  it.only('DevOps Training Kubernetes', () => {
    testSeries7();
  });
});