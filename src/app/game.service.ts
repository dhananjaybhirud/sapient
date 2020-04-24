import {Injectable, PipeTransform} from '@angular/core';

import {BehaviorSubject, Observable, of, Subject} from 'rxjs';

import {Game} from './game';
// import {GAMES} from './games';
import {DecimalPipe} from '@angular/common';
import {debounceTime, delay, switchMap, tap} from 'rxjs/operators';
import {SortColumn, SortDirection} from './sortable.directive';
import {GamelistService} from './gamelist.service';

interface SearchResult {
  games: Game[];
  total: number;
}

interface State {
  page: number;
  pageSize: number;
  searchTerm: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}

const compare = (v1: string, v2: string) => v1 < v2 ? -1 : v1 > v2 ? 1 : 0;

function sort(games: Game[], column: SortColumn, direction: string): Game[] {
  if (direction === '' || column === '') {
    return games;
  } else {
    return [...games].sort((a, b) => {
      const res = compare(`${a[column]}`, `${b[column]}`);
      return direction === 'asc' ? res : -res;
    });
  }
}

function matches(game: Game, term: string, pipe: PipeTransform) {
  // console.log(' game.title ', game , game.title );
  return (typeof game.title === 'string') ? (game.title.toLowerCase().includes(term.toLowerCase())) : '';
  // || pipe.transform(game.area).includes(term)
  // || pipe.transform(game.population).includes(term);
}


@Injectable({
  providedIn: 'root'
})
export class GameService {
  private _loading$ = new BehaviorSubject<boolean>(true);
  private _search$ = new Subject<void>();
  private _games$ = new BehaviorSubject<Game[]>([]);
  private _total$ = new BehaviorSubject<number>(0);
  private GAMES;

  private _state: State = {
    page: 1,
    pageSize: 100,
    searchTerm: '',
    sortColumn: '',
    sortDirection: ''
  };

  constructor(private pipe: DecimalPipe, private ts: GamelistService) {
    this.ts.getData().subscribe(
      (res: Response) => {
        this.GAMES = res;
        // console.log('constructor', this.GAMES);
        this._search$.pipe(
          tap(() => this._loading$.next(true)),
          debounceTime(200),
          switchMap(() => this._search()),
          delay(200),
          tap(() => this._loading$.next(false))
        ).subscribe(result => {
          this._games$.next(result.games);
          this._total$.next(result.total);
        });

        this._search$.next();
      }
    );


  }

  get games$() {
    return this._games$.asObservable();
  }

  get total$() {
    return this._total$.asObservable();
  }

  get loading$() {
    return this._loading$.asObservable();
  }

  get page() {
    return this._state.page;
  }

  get pageSize() {
    return this._state.pageSize;
  }

  get searchTerm() {
    return this._state.searchTerm;
  }

  set page(page: number) {
    this._set({page});
  }

  set pageSize(pageSize: number) {
    this._set({pageSize});
  }

  set searchTerm(searchTerm: string) {
    this._set({searchTerm});
  }

  set sortColumn(sortColumn: SortColumn) {
    this._set({sortColumn});
  }

  set sortDirection(sortDirection: SortDirection) {
    this._set({sortDirection});
  }

  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
    this._search$.next();
  }

  private _search(): Observable<SearchResult> {
    const {sortColumn, sortDirection, pageSize, page, searchTerm} = this._state;

    // console.log('GAMES', this.GAMES);
    // 1. sort
    let games = sort(this.GAMES, sortColumn, sortDirection);

    // 2. filter
    games = games.filter(game => matches(game, searchTerm, this.pipe));
    const total = games.length;

    // 3. paginate
    games = games.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    return of({games, total});
  }
}
