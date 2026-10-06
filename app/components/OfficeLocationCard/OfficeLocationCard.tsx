import styles from './OfficeLocationCard.module.scss'
import Img from '@/app/components/Img/Img'

function OfficeLocationCard() {
  return (
    <div className={styles.officeLocation}>
      <div className={styles.title}>
        <h2>社團辦公室</h2>
        <p>中臺科技大學 天機教學大樓 2323</p>
      </div>
      <Img
        src="/assets/image/maps/office-map.webp"
        alt="社團辦公室位置圖片"
        className={styles.office_image}
        width={1920}
        height={1080}
      />
    </div>
  )
}

export default OfficeLocationCard
