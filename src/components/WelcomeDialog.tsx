// 初回訪問時だけ表示する導入ダイアログ（マニュアルへの誘導つき）
interface Props {
  onStart: () => void
  onReadManual: () => void
}

export function WelcomeDialog({ onStart, onReadManual }: Props) {
  return (
    <div className="overlay">
      <div className="complete-panel" role="dialog" aria-label="ようこそ">
        <h2>地図問屋『うそアトラス』へようこそ</h2>
        <p>
          時は大航海のころ。船長たちが持ち帰る報告を「信じる」か「信じない」か——
          あなたの選択だけが、世界地図のかたちを決めます。
        </p>
        <div className="report-buttons">
          <button type="button" className="btn-believe" onClick={onStart}>
            船出する
          </button>
          <button type="button" onClick={onReadManual}>
            先に遊び方を読む
          </button>
        </div>
      </div>
    </div>
  )
}
