import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportingCenter } from './reporting-center';

describe('ReportingCenter', () => {
  let component: ReportingCenter;
  let fixture: ComponentFixture<ReportingCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingCenter],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingCenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
