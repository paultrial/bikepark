import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TracksService } from './tracks.service';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  animations: [
    trigger('debuDataToggleAnim', [
      state('open', style({
        width: "100%",
        height: "300px",
        opacity: 0.4,
        backgroundColor: 'blue'
      })),
      state('closed', style({
        height: '0px',
        width: '0px',
        opacity: 0.9,
        backgroundColor: 'red'
      })),
      transition('open => closed', [
        animate('1s')
      ]),
      transition('closed => open', [
        animate('1.5s')
      ])
    ]),
    trigger('trackInfoAnim', [
      state('hidden', style({
        top: "-200px"
      })),
      state('visible', style({
        top: "126px"
      })),
      transition('hidden => visible', [
        animate("400ms ease-in")
      ]),
      transition('visible => hidden', [
        animate("400ms ease-out")
      ])
    ]),
    trigger('captionInfoAnim', [
      state('hidden', style({
        right: `-${window.innerWidth + 100}px`
      })),
      state('visible', style({
        right: "15px"
      })),
      transition('hidden => visible', [
        animate("500ms ease-in")
      ]),
      transition('visible => hidden', [
        animate("500ms ease-out")
      ])
    ])
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  cl: any = {};
  clu: any = {};

  public windowInnerWidth = window.innerWidth;
  public windowInnerHeight = window.innerHeight;
  public cp: any = {};
  public map!: google.maps.Map;
  public watchID: any = undefined;
  public debugData = false;
  public followMe = false;
  public direction = false;
  public poiClicked = false;
  public captionInfoVisible = false;

  public poiStartOptions: google.maps.MarkerOptions = {
    clickable: true,
    icon: './assets/start.png',
    zIndex: -1
  }
  
  public poiFinishOptions: google.maps.MarkerOptions = {
    icon: './assets/finish.png',
    zIndex: -1
  }

  public poiClosed: google.maps.MarkerOptions = {
    icon: './assets/closed.png',
  }

  public mapOptions: google.maps.MapOptions = {
    center: { lat: 45.583726, lng: 25.553073 },
    zoom: 14,
    streetViewControl: false,
    isFractionalZoomEnabled: true,
    zoomControl: true,
    gestureHandling: 'greedy'
  }

  public accuracyCircleOptions: google.maps.CircleOptions = {
    strokeColor: 'transparent',
    fillOpacity: 0.19,
    fillColor: '#1a73e9',
    zIndex: 4
  }

  private pinpointMultiplier = 0.2920497220;
  public pinPointRadius = 50;
  public KMLtracks: string[] = [];

  public pinPointCircleOptions: google.maps.CircleOptions = {
    strokeColor: 'white',
    strokeWeight: 1,
    fillOpacity: 1,
    radius: Math.pow(2, (21 - (this.mapOptions.zoom as number))) * this.pinpointMultiplier,
    fillColor: '#1a73e9',
    zIndex: 4
  }
  public trasee = <any>[];
  public pois = <any>[];
  public closed = <any>[];

  public poisOptions: google.maps.MarkerOptions = {
    clickable: true,
    icon: './assets/poi.png'
  }

  public closedTrackLineOptions: google.maps.PolylineOptions = {
    strokeColor: 'yellow',
    strokeOpacity: 0.5,
    strokeWeight: 6,
    zIndex: 5,
    visible: true,
    clickable: false
  }

  public tSelected: any = undefined;
  public circleCenter: google.maps.LatLngLiteral = { lat: 45.583726, lng: 25.553073 };
  public mapCenter: google.maps.LatLngLiteral = { lat: 45.583726, lng: 25.553073 };

  public headingPolyline: google.maps.LatLngLiteral[];

  public arrow: google.maps.LatLng[] = [];

  public headingOptions: google.maps.PolylineOptions = {
    strokeColor: 'yellow'
  }

  constructor(
    private trackService: TracksService,
    private chdet: ChangeDetectorRef,
    private r: ActivatedRoute
  ) {
    this.mapOptions.mapTypeId = 'satellite'
  }

  ngOnInit(): void {
    navigator.geolocation.getCurrentPosition(cp => {
      this.cp.accuracy = cp.coords.accuracy;
      this.cp.altitude = cp.coords.altitude;
      this.cp.altitudeAccuracy = cp.coords.altitudeAccuracy;
      this.cp.heading = cp.coords.heading;
      this.cp.latitude = cp.coords.latitude;
      this.cp.longitude = cp.coords.longitude;
      this.cp.speed = cp.coords.speed;

      if (!Number.isNaN(cp.coords.latitude) && !Number.isNaN(cp.coords.longitude)) {
        this.circleCenter = {
          lat: cp.coords.latitude,
          lng: cp.coords.longitude
        }
        this.pinPointRadius = Math.pow(2, (21 - this.cp.zoom)) * this.pinpointMultiplier;
      }

      // this.headingPolyline = [this.circleCenter, google.maps.geometry.spherical.computeOffset(
      //   this.circleCenter,
      //   cp.coords.accuracy,
      //   cp.coords.heading as any).toJSON()];

    }, this.locationErr, { enableHighAccuracy: true });

    this.watchID = navigator.geolocation.watchPosition((cp: any) => {
      this.cp.accuracy = cp.coords.accuracy;
      this.cp.altitude = cp.coords.altitude;
      this.cp.altitudeAccuracy = cp.coords.altitudeAccuracy;
      this.cp.heading = cp.coords.heading + Math.random();
      this.cp.latitude = cp.coords.latitude;
      this.cp.longitude = cp.coords.longitude;

      if (cp.coords.speed < 0.05 || cp.coords == null) {
        this.cp.speed = null;
      } else {
        this.cp.speed = cp.coords.speed;
      }

      if (!Number.isNaN(cp.coords.latitude) && !Number.isNaN(cp.coords.longitude)) {
        this.circleCenter = {
          lat: cp.coords.latitude,
          lng: cp.coords.longitude
        }

        if (this.followMe) {
          this.mapCenter = this.circleCenter;
        }

        this.pinPointRadius = Math.pow(2, (21 - this.cp.zoom)) * this.pinpointMultiplier;
        this.headingPolyline = [this.circleCenter, google.maps.geometry.spherical.computeOffset(
          this.circleCenter,
          cp.coords.accuracy,
          cp.coords.heading).toJSON()];
        this.arrow = this.calcArrow();
      } else {
        alert("no location detected");
      }

      // this.chdet.detectChanges();

    }, this.locationErr, { enableHighAccuracy: true })

    window.addEventListener("orientationchange", this.orientationChange);
    window.addEventListener("resize", this.orientationChange);

    window.addEventListener('resize', () => {
      document.body.style.height = this.windowInnerHeight + "px";
      document.body.style.width = this.windowInnerWidth + "px";
    });

    this.trackService.tracks.subscribe((t: any[]) => {
      if (t.length) {
        this.trasee = t;

        this.map.addListener('click', (event: any) => {
          this.trackService.closedTrack(
            this.findClosestPointOnTrack(event.latLng.toJSON())
          )
        });

        this.r.queryParams.subscribe(data => {
          if (Object.keys(data).length) {
            const tq = data[Object.keys(data)[0]]; // track query param
            const tqIndex = this.trasee.map((e: any) => e.QRname).indexOf(tq);
            this.map.setZoom(20);
            this.map.setCenter(this.trasee[tqIndex].poiStart);
          }
        });
      }
    });

    this.trackService.points.subscribe((p: any[]) => {
      if (p.length) {
        this.pois = p;
      }
    });

    this.trackService.closed.subscribe(c => {
      this.closed = c.map((e: any) => {
        return {
          points: e,
          closedStart: e[0],
          closedEnd: e[e.length - 1]
        }
      })
    })

    /*
    
    Notification.requestPermission().then(yes => {
      // alert(yes);
      if (yes === "granted") {
        setInterval(() => {
          new Notification("Notification from Bikepark Postavaru", {
            body: "detalii aici",
            vibrate: [200, 100, 200, 100, 200, 100, 200]
          });
        }, 10000);
      }
    });

    */
  }

  ngOnDestroy(): void {
    navigator.geolocation.clearWatch(this.watchID);
  }

  public polylineClick = (event: google.maps.PolyMouseEvent, t: any) => {
    let doTheDirtyDeed = false;
    if (this.tSelected !== undefined) {
      this.tSelected = undefined;
      doTheDirtyDeed = true;
    }

    const doTheDeed = () => {
      this.tSelected = t;
      this.trasee.forEach((traseu: any) => {
        if (traseu.name !== t.name)
          traseu.lineOptions.visible = false;
      });
    }

    if (doTheDirtyDeed) {
      setTimeout(doTheDeed, 400);
    } else {
      doTheDeed();
    }
    // this.map.notify(t.name);
    // this.chdet.detectChanges();
  }

  public markerClick = (event: google.maps.MapMouseEvent, poi: any) => {
    this.poiClicked = true;
    if (poi) {
      this.polylineClick(event, poi);
    }
  }

  public trackStartMarkerClick = (event: google.maps.MapMouseEvent, poi: any) => {
    this.poiClicked = false;
    const t = this.trasee.filter((e: any) => e.points[0].lat == poi.lat && e.points[0].lng == poi.lng)[0];
    this.polylineClick(event, t);
  }

  public trackFinishMarkerClick = (event: google.maps.MapMouseEvent, poi: any) => {
    this.poiClicked = false;
    const t = this.trasee.filter((e: any) => e.points[e.points.length - 1].lat == poi.lat && e.points[e.points.length - 1].lng == poi.lng)[0];
    this.polylineClick(event, t);
  }

  public deselect = () => {
    this.poiClicked = false;
    this.tSelected = undefined;
    this.trasee.forEach((e: any) => e.lineOptions.visible = true);
  }

  private locationErr = (err: any) => {
    console.error(err);
    if (err.message == 'User denied Geolocation') {
      alert("Location may not be provided. Please check your settings");
    }
  }

  private orientationChange = (event: Event) => {
    setTimeout(() => {
      this.windowInnerWidth = window.innerWidth;
      this.windowInnerHeight = window.innerHeight;
    }, 400)
  }

  public moveMap = (data: google.maps.event) => {
    this.cp.zoom = this.map.getZoom();
    this.pinPointRadius = Math.pow(2, (21 - this.cp.zoom)) * this.pinpointMultiplier;
    this.arrow = this.calcArrow();

    this.chdet.detectChanges();
  }

  public findMe = () => {
    if (this.cp.latitude == undefined && this.cp.longitude == undefined) {
      alert("no location detected");
    }

    this.followMe = !this.followMe;
    this.mapCenter = { lat: this.cp.latitude, lng: this.cp.longitude };
    this.map.setZoom(Math.log2(591657550.5 / (this.cp.accuracy * 45)) + 1);
    this.chdet.detectChanges();
  }

  public mapinit = (map: google.maps.Map): void => {
    this.map = map;

    this.pinPointRadius = Math.pow(2, (21 - this.cp.zoom)) * this.pinpointMultiplier;
    map.addListener('center_changed', this.moveMap);
    map.addListener('drag', this.moveMap);
    map.addListener('dragend', this.moveMap);
    map.addListener('bounds_changed', this.moveMap);

    map.setOptions({
      tilt: 0
    })

    map.setHeadingInteractionEnabled(true);
    map.setTiltInteractionEnabled(false);

    map.setTilt(0);

    map.addListener('tilt_changed', () => {
      map.setTilt(0);
    });
  }

  public toggleDebugData = () => {
    this.debugData = !this.debugData;
  }

  calcArrow = (): google.maps.LatLng[] => {
    const heading = this.cp.heading;
    const height = (Math.pow(2, (21 - this.cp.zoom)) * this.pinpointMultiplier) * 4;
    const wingLength = height;
    const rightWingAngle = heading - 155;
    const leftWingAngle = heading + 155;
    const thrusterLength = height / 2.6;
    const thrusterAngle = heading;
    const lead = google.maps.geometry.spherical.computeOffset(this.circleCenter, height, heading);
    const rightwingTip = google.maps.geometry.spherical.computeOffset(lead, wingLength, rightWingAngle);
    const leftwingTip = google.maps.geometry.spherical.computeOffset(lead, wingLength, leftWingAngle);
    const thrusterTip = google.maps.geometry.spherical.computeOffset(this.circleCenter, thrusterLength, thrusterAngle)

    return [lead, rightwingTip, thrusterTip, leftwingTip];
  }

  infoToggle = (): void => {
    this.captionInfoVisible = !this.captionInfoVisible;
  }

  calculateDistance = (p1x: number, p1y: number, p2x: number, p2y: number): number => {
    const xDistance = p1x - p2x;
    const yDistance = p1y - p2y;
    return Math.sqrt(xDistance ** 2 + yDistance ** 2);
  }

  findClosestPointOnTrack = (potg: any): any => {
    const dict = <any>[];
    this.trasee.forEach((traseu: any) => {
      const distances: any[] = [];

      traseu.points.forEach((point: any) => {
        distances.push(this.calculateDistance(point.lat, point.lng, potg.lat, potg.lng));
      });

      traseu.distances = distances;
      traseu.smallestDist = Math.min(...distances)
      const indexOfSmallest = distances.indexOf(traseu.smallestDist);
      traseu.indexOfSmallest = indexOfSmallest;
      dict.push(traseu);
    });

    const smallestDistances = dict.map((e: any) => e.smallestDist);
    const theNearestTrack = dict[smallestDistances.indexOf(Math.min(...smallestDistances))];

    console.log(`track: ${theNearestTrack.name}, point: ${theNearestTrack.indexOfSmallest}`);
    return {
      track: theNearestTrack.name,
      point: theNearestTrack.indexOfSmallest
    }

  }
}
