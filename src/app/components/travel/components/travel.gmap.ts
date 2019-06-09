import { Component, OnInit } from '@angular/core';
import { cancelableDelay, delay } from '../../shared/common/delay';
import { elementInViewport } from '../../shared/common/element.in.viewport';
import { IAirport } from '../definitions/airport';
import { ICity } from '../definitions/city';
import { IPort } from '../definitions/port';
import { RailTrip, RailTrips } from '../definitions/rail.trips';
import { IStation } from '../definitions/station';
import { AIRPORTS } from '../models/airports';
import { CITIES } from '../models/cities';
import { CRUISES, UPCOMING_CRUISES } from '../models/cruises';
import { FLIGHTS, UPCOMING_FLIGHTS } from '../models/flights';
import { MAP_OPTIONS } from '../models/map.config';
import { AUCKLAND_POINT } from '../models/points';
import { PORTS } from '../models/ports';
import { STATIONS } from '../models/stations';
import { TravelService } from '../service/travel';
import { MapUtil } from './gmap/map.util';
import { MarkerUtil } from './gmap/marker.util';
import { PolylineUtil } from './gmap/polyline.util';

@Component({
  selector: 'app-googlemap',
  styleUrls: ['./travel.gmap.scss'],
  templateUrl: 'travel.gmap.html',
})
export class TravelMapComponent implements OnInit {
  public map: google.maps.Map;
  private _travelService: TravelService;
  private _additionalMarkerWait: number;
  private _markerDropWait: number;
  private _cityMarkers: Array<google.maps.Marker>;
  private _cruiseLines: Array<google.maps.Polyline>;
  private _flightLines: Array<google.maps.Polyline>;
  private _railPaths: Array<string>;
  private _mapMarkersDrawn: boolean;
  private _mapUtil: MapUtil;
  private _markerUtil: MarkerUtil;
  private _polylineUtil: PolylineUtil;
  private _markerWait: number;
  private _tilesLoaded: boolean;
  private _tilesLoadedEvent: any;
  private _timeoutScroll: any;
  private _upcomingCruiseLines: Array<google.maps.Polyline>;
  private _upcomingFlightLines: Array<google.maps.Polyline>;
  private _upcomingRailPaths: Array<string>;
  private _railPathsLoaded: boolean;

  constructor(_travelService: TravelService) {
    this._travelService = _travelService;
    this._additionalMarkerWait = 0;
    this._markerDropWait = 0;
    this._cityMarkers = [];
    this._cruiseLines = [];
    this._mapMarkersDrawn = false;
    this._mapUtil = new MapUtil();
    this._markerUtil = new MarkerUtil();
    this._polylineUtil = new PolylineUtil();
    this._tilesLoaded = false;
    this._upcomingCruiseLines = [];
    this._upcomingFlightLines = [];
    this._railPathsLoaded = false;
  }

  ngOnInit(): void {
    this.initRailTripPaths();
    this.initializeMap();
    this.initScrollListener();
  }

  initRailTripPaths(): void {
    this._travelService.getRailTripPaths().subscribe(
      (resp: RailTrips) => {
        this._railPaths = resp.railTrips.map((railTrip: RailTrip) => railTrip.path);
        this._upcomingRailPaths = resp.upcomingRailTrips.map((railTrip: RailTrip) => railTrip.path);
        this._railPathsLoaded = true;
      },
      () => console.warn('railTripPaths not returned'),
    );
  }

  initializeMap(): void {
    const MAP_MAX_MOBILE_ZOOM_ZERO = 768;
    (($: JQueryStatic) =>
      delay(250).then(() => {
        const mapOptions: google.maps.MapOptions = Object.assign({}, MAP_OPTIONS);
        if ($(window).width() < MAP_MAX_MOBILE_ZOOM_ZERO) {
          mapOptions.zoom = 1;
          mapOptions.minZoom = 1;
        }
        this.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        this._flightLines = this._polylineUtil.createPolylines(FLIGHTS, this.map, '#494c54');
        this._upcomingFlightLines = this._polylineUtil.createDottedPolylines(UPCOMING_FLIGHTS, this.map, '#494c54');
        this._cruiseLines = this._polylineUtil.createPolylines(CRUISES, this.map, '#00739c');
        this._upcomingCruiseLines = this._polylineUtil.createDottedPolylines(UPCOMING_CRUISES, this.map, '#00739c');
        this._tilesLoadedEvent = google.maps.event.addListener(this.map, 'tilesloaded', () => {
          google.maps.event.removeListener(this._tilesLoadedEvent);
          this._tilesLoaded = true;
          this.dropMarkersDrawLines();
        });
      }))(jQuery);
  }

  initScrollListener(): void {
    (($: JQueryStatic) => {
      $(document).on('scroll', () => {
        // wait half a second for scroll to stop
        if (this._timeoutScroll) {
          clearTimeout(this._timeoutScroll);
        }
        this._timeoutScroll = cancelableDelay(250, () => {
          if (!this._mapMarkersDrawn) {
            this.dropMarkersDrawLines(500);
          }
        });
      });
    })(jQuery);
  }

  canDropMarkersDrawLines(): boolean {
    return !this._mapMarkersDrawn && this._tilesLoaded && this._railPathsLoaded;
  }

  dropMarkersDrawLines(wait: number = 750): void {
    this._markerWait = wait;
    (($: JQueryStatic) =>
      $('.js_trigger_map_marker').each((index: number, triggerEl: Element) => {
        if (this.canDropMarkersDrawLines() && elementInViewport($, <JQuery> $(triggerEl))) {
          this._mapMarkersDrawn = true;
          delay(this._markerWait).then(() => {
            AIRPORTS.forEach((airport: IAirport) => {
              delay(++this._markerDropWait * 135)
                .then(() => this._markerUtil.addAirportMarker(this.map, airport));
            });
            PORTS.forEach((port: IPort) => {
              delay(++this._markerDropWait * 135)
                .then(() => this._markerUtil.addPortMarker(this.map, port));
            });
            STATIONS.forEach((station: IStation) => {
              delay(++this._markerDropWait * 135)
                .then(() => this._markerUtil.addStationMarker(this.map, station));
            });
            this._polylineUtil.pushToPolylines(this._flightLines, FLIGHTS);
            this._polylineUtil.pushToPolylines(this._upcomingFlightLines, UPCOMING_FLIGHTS);
            this._polylineUtil.pushToPolylines(this._cruiseLines, CRUISES);
            this._polylineUtil.pushToPolylines(this._upcomingCruiseLines, UPCOMING_CRUISES);
            this._polylineUtil.createPolylineFromPath(this._railPaths, this.map, '#ac3333');
            this._polylineUtil.createDottedPolylineFromPath(this._upcomingRailPaths, this.map, '#ac3333');

            this._additionalMarkerWait = AIRPORTS.length + PORTS.length;
            CITIES.forEach((city: ICity, _index: number) =>
              delay((_index * 650) + this._additionalMarkerWait)
                .then(() => this._markerUtil.addCityMarker(this.map, city, this._cityMarkers)));
            this._additionalMarkerWait = this._additionalMarkerWait * 65;
            delay((CITIES.length * 700) + this._additionalMarkerWait).then(() => {
              this.map.panTo(AUCKLAND_POINT);
              this._mapUtil.zoomMap(this.map, this.map.getZoom() + 1, 5);
            });
            this._polylineUtil.setZoomChangedListener(this.map);
            this._markerUtil.setZoomChangedListener(this.map);
          });
        }
      }))(jQuery);
  }
}
