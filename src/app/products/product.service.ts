import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  merge,
  Observable,
  scan,
  Subject,
  tap,
  throwError,
  shareReplay,
  switchMap,
  filter,
  forkJoin,
  of,
} from 'rxjs';

import { ProductCategoryService } from '../product-categories/product-category.service';
import { Product } from './product';
import { ProductCategory } from '../product-categories/product-category';
import { SupplierService } from '../suppliers/supplier.service';
import { Supplier } from '../suppliers/supplier';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private productsUrl = 'api/products';
  private suppliersUrl = 'api/suppliers';

  products$ = this.http.get<Product[]>(this.productsUrl).pipe(
    tap((data) => console.log('Products: ', JSON.stringify(data))),
    catchError(this.handleError)
  );

  productsWithCategory$ = combineLatest([
    this.products$,
    this.categoryService.productCategories$,
  ]).pipe(
    map(([ps, cs]) => ps.map((p) => this._rebuildProduct(p, cs))),
    shareReplay(1)
  );

  private productSelectedSubject = new BehaviorSubject<number>(0);
  productSelectedAction$ = this.productSelectedSubject.asObservable();

  selectedProduct$ = combineLatest([
    this.productsWithCategory$,
    this.productSelectedAction$,
  ]).pipe(
    map(([ps, selectedId]) => ps.find((p) => p.id === selectedId)),
    tap((p) => console.log('selectedProduct', p)),
    shareReplay(1)
  );

  // selectedProductSuppliers$ = combineLatest([
  //   this.selectedProduct$,
  //   this.suppliersService.suppliers$,
  // ]).pipe(
  //   map(([selectedProduct, suppliers]) =>
  //     suppliers.filter((s) => selectedProduct?.supplierIds?.includes(s.id))
  //   )
  // );

  selectedProductSuppliers$ = this.selectedProduct$.pipe(
    filter((product) => Boolean(product)),
    switchMap((product) =>
      !!product?.supplierIds
        ? forkJoin(product.supplierIds.map((id) => this._getSupplier(id)))
        : of([])
    ),
    tap((xs) => console.log('product suppliers', JSON.stringify(xs)))
  );

  private productInsertedSubject = new Subject<Product>();
  productInsertedAction$ = this.productInsertedSubject.asObservable();

  productsWithAdd$ = merge(
    this.productsWithCategory$,
    this.productInsertedAction$
  ).pipe(
    scan(
      (acc, value) => (value instanceof Array ? [...value] : [...acc, value]),
      [] as Product[]
    )
  );

  constructor(
    private http: HttpClient,
    private categoryService: ProductCategoryService,
    private suppliersService: SupplierService
  ) {}

  addProduct(newProduct?: Product) {
    newProduct = newProduct || this.fakeProduct();
    this.productInsertedSubject.next(newProduct);
  }

  selectedProductChanged(selectedProductId: number) {
    this.productSelectedSubject.next(selectedProductId);
  }

  private _getSupplier(supplierId: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`);
  }

  private _rebuildProduct(p: Product, cs: ProductCategory[]): Product {
    return {
      ...p,
      price: p.price ? p.price * 1.5 : 0,
      category: cs.find((c) => p.categoryId === c.id)?.name,
      searchKey: [p.productName],
    };
  }

  private fakeProduct(): Product {
    return {
      id: 42,
      productName: 'Another One',
      productCode: 'TBX-0042',
      description: 'Our new product',
      price: 8.9,
      categoryId: 3,
      category: 'Toolbox',
      quantityInStock: 30,
    };
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Backend returned code ${err.status}: ${err.message}`;
    }
    console.error(err);
    return throwError(() => errorMessage);
  }
}
