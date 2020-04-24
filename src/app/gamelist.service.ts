import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GamelistService {
  constructor(private http: HttpClient) { }
  getData() {
    return this.http.get('http://starlord.hackerearth.com/gamesext');
  }
}
