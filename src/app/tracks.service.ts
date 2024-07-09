import { Injectable } from '@angular/core';
import { tracks } from './tracks';
import { pois } from './tracks';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class TracksService {
  closedCache = <any>[];
  public t = <any>[];
  public c = <any>[];
  public p = <any>[];
  public tracks = new BehaviorSubject([]);
  public closed = new BehaviorSubject([]);
  public points = new BehaviorSubject([]);

  constructor(private http: HttpClient) {
    tracks.forEach((track) => {
      const link = `assets/json/${track}.json`;
      this.http.get(link, { responseType: 'text' }).subscribe(data => {
        let trackData = JSON.parse(data);
        const name = trackData.features[0].properties.name;
        const QRname = trackData.features[0].properties.QRname;
        const urlFlag = Object.prototype.hasOwnProperty.call(trackData.features[0].properties, 'url');
        const type = trackData.features[0].geometry.coordinates.map((e: any) => typeof (e));
        const d = trackData.features[0].properties.difficulty; //difficulty

        if (type.every((e: any) => e == "object")) {
          let points = trackData.features[0].geometry.coordinates.map((e: any): any => {
            if (!isNaN(e[1]) || !isNaN(e[0])) {
              return { 'lat': +e[1], 'lng': +e[0] }
            }
          });

          const difficultyFlag = Object.prototype.hasOwnProperty.call(trackData.features[0].properties, "difficulty");
          // const difficulty = difficultyFlag ? this.getDifficulty(d) : this.nameColor(name);
          const trackLength = google.maps.geometry.spherical.computeLength(points);

          this.t.push({
            name: name,
            QRname: QRname,
            url: urlFlag ? trackData.features[0].properties.url : undefined,
            points: points,
            trackLength: trackLength.toFixed(2),
            altDiff: Math.abs(+trackData.features[0].properties.alt_descent),
            difficulty: d,
            poiStart: points[0],
            poiFinish: points[points.length - 1],
            strokeWeight: 7,
            zIndex: 1,
            lineOptions: {
              strokeColor: d,
              strokeWeight: 7,
              visible: true,
              clickable: true
            }
          });
          
          this.t.push({
            points: points,
            lineOptions: {
              strokeColor: "white",
              strokeWeight: 9,
              zIndex: -1,
              visible: true,
              clickable: false
            }
          });
        }
        this.send();
      });
    });

    pois.forEach(poi => {
      const link = `assets/poi/json/${poi}.json`;
      this.http.get(link, { responseType: 'text' }).subscribe(data => {
        let trackData = JSON.parse(data);
        const name = trackData.features[0].properties.name;
        const type = trackData.features[0].geometry.coordinates.map((e: any) => typeof (e))
        this.p.push({
          name: name,
          lat: +trackData.features[0].geometry.coordinates[1],
          lng: +trackData.features[0].geometry.coordinates[0]
        });

        this.send();
      })
    });

    this.http.get('assets/closed.json', { responseType: 'text' }).subscribe(cData => {
      this.closed.next(JSON.parse(cData));
    })

    document.addEventListener('keydown', (event) => {
      event.preventDefault();
      if (event.code === 'KeyZ' && event.ctrlKey === true) {
        // alert("da");
        this.clearClosedCache();
      }
    });

  }

  send = _.debounce(() => {
    // locaton storage ?
    // bad internet ?
    this.tracks.next(this.t);
    this.points.next(this.p);
  }, 400, { trailing: true })

  closedTrack = (point: any) => {
    if (this.closedCache.length <= 1) {
      this.closedCache.push(point);
    }
    if (this.closedCache.length == 2) {
      const t = this.closedCache.map((e: any) => e.track);
      const p = this.closedCache.map((e: any) => e.point);
      if (t[0] === t[1] && p[0] !== p[1]) {
        const caca = this.t.find((e: any) => e.name == point.track);
        const pippi = caca.points.slice(...p);
        console.log(caca.points.slice(...p).length);
        console.log(JSON.stringify(pippi));
        const c:any= this.closed.getValue();
        c.push(pippi);
        this.closed.next(c);
      } else {
        // alert("nu");
        this.clearClosedCache();
      }
    }
  }

  clearClosedCache = (): void => {
    this.closedCache = [];
  }
}
