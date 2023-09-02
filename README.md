# trigger-amazon-connect

Amazon Connectで自動発信するためのLambda Functionです。

## [connect](./connect)

特定の電話番号に発信して、Amazon Connectのフローを起動するためのLambda Functionです。

## [scheduler](./scheduler/)

Amazon Connectのフローで完了プロセスが実行されなかった場合、再度発信するためにEvent Bridge Schedulerを作成するLambda Functionです。

10分後の時刻でEvent Bridge Schedulerを作成します。

ただし実行回数がMAX_COUNTを超えた場合は、再スケジュールせずに終了します。