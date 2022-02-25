import { Component, OnInit } from '@angular/core';
import { of, from } from 'rxjs';
import { map, tap, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'RxJS in Angular (Kurata)';

  ngOnInit() {
    of(2, 4, 5, 6)
      .pipe(
        map((x) => x * 2),
        tap((x) => console.log('tap, x = ', x)),
        take(3)
      )
      .subscribe((x) => console.log('observed, x = ', x));
  }
}
