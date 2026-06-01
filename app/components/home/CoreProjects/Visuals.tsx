'use client'

import Image from 'next/image'
import styles from './CoreProjects.module.scss'

// components
import { useSpring, animated, config } from '@react-spring/web'
import { useState, useCallback, useMemo } from 'react'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faCheckCircle,
  faBars,
  faMicrochip,
  faBatteryFull,
  faBug,
  faXmark,
  faMinus,
  faSort,
} from '@fortawesome/free-solid-svg-icons'
import { faApple } from '@fortawesome/free-brands-svg-icons'
import { Link } from '@/i18n/navigation'

/**
 * [component] Web 視覺效果
 * @returns {JSX.Element} WebVisual
 */
export const WebVisual = () => {
  // 進入動畫
  const springZoomIn = useSpring({
    from: { opacity: 0, transform: 'scale(0.9)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: config.gentle,
  })

  return (
    <animated.div className={styles.visualContainer} style={springZoomIn}>
      <div className={styles.webWindow}>
        <div className={styles.windowHeader}>
          <div className={`${styles.dot} ${styles.red}`}>
            <FontAwesomeIcon icon={faXmark} />
          </div>
          <div className={`${styles.dot} ${styles.yellow}`}>
            <FontAwesomeIcon icon={faMinus} />
          </div>
          <div className={`${styles.dot} ${styles.green}`}>
            <FontAwesomeIcon icon={faSort} />
          </div>
        </div>
        <div className={styles.windowContent}>
          <div className={styles.header}>
            <Link href="/">
              <Image
                src="/assets/image/home/robotctust-home-image.png"
                alt="logo"
                className={styles.logo}
                width={100}
                height={100}
              />
            </Link>
            <div>
              <Link href="/news">最新資訊</Link>
              <Link href="/calendar">行事曆</Link>
              <Link href="/about">關於</Link>
            </div>
            <FontAwesomeIcon icon={faBars} />
          </div>
          <div className={styles.heroArea}>
            <Image
              src="/assets/image/home/robotctust-home-image.png"
              alt="logo"
              width={100}
              height={100}
            />
            <div className={styles.subtitle}></div>
            <div className={styles.title1}></div>
            <div className={styles.title2}></div>
            <div className={styles.description}></div>
          </div>
        </div>
      </div>
      <div className={styles.backgroundBlur} />
    </animated.div>
  )
}

/**
 * [component] 傳感器燈光
 * @param {any} active 激活狀態 (SpringValue<number>) 0-1
 * @returns {JSX.Element} SensorLight
 * @returns
 */
const SensorLight = ({ active }: { active: any }) => {
  return (
    <animated.div
      className={active.to(
        (v: number) => `${styles.sensor} ${v > 0.5 ? styles.active : ''}`,
      )}
    />
  )
}

/**
 * [component] 新版社團機器人視覺效果
 * @returns {JSX.Element} RoboticsVisual
 */
export const RoboticsVisual = () => {
  // 進入動畫
  const springZoomIn = useSpring({
    from: { opacity: 0, transform: 'scale(0.9)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: config.gentle,
  })

  // 滾動背景，模擬前進
  const { scrollY } = useSpring({
    from: { scrollY: 0 },
    to: { scrollY: 100 },
    loop: true,
    config: { duration: 2000, easing: (t) => t },
  })

  // 模擬 PID 修正動作
  const { x, r, leftSensor, rightSensor, centerSensor } = useSpring({
    from: { x: 0, r: 0, leftSensor: 0, rightSensor: 0, centerSensor: 1 },
    to: async (next) => {
      while (true) {
        // 模擬隨機修正
        const randomDir = Math.random() > 0.5 ? 1 : -1

        // 偏移
        await next({
          x: 6 * randomDir,
          r: 6 * randomDir,
          leftSensor: randomDir > 0 ? 1 : 0,
          rightSensor: randomDir < 0 ? 1 : 0,
          centerSensor: 0,
          config: { tension: 500, friction: 70 },
        })
        // 回正
        await next({
          x: 0,
          r: 0,
          leftSensor: 0,
          rightSensor: 0,
          centerSensor: 1,
          config: { tension: 140, friction: 10 },
        })
      }
    },
  })

  return (
    <animated.div className={styles.visualContainer} style={springZoomIn}>
      <div className={styles.roboticsScene}>
        <animated.div
          className={styles.trackLine}
          style={{
            backgroundPosition: scrollY.to((y) => `center ${y}%`),
          }}
        />

        <animated.div
          className={styles.robotBody}
          style={{
            x,
            rotate: r,
          }}
        >
          <div className={styles.robotBodyInner}></div>
          <div className={`${styles.wheel} ${styles.left}`}>
            <div className={styles.tread} />
          </div>
          <div className={`${styles.wheel} ${styles.right}`}>
            <div className={styles.tread} />
          </div>

          <div className={styles.chassisInner}>
            <div className={styles.components}>
              <FontAwesomeIcon icon={faMicrochip} className={styles.chip} />
              <div className={styles.battery}>
                <FontAwesomeIcon icon={faBatteryFull} />
              </div>
            </div>
            <div className={styles.wires} />
          </div>

          <div className={styles.sensors}>
            <SensorLight active={leftSensor} /> {/* 左邊傳感器 */}
            <SensorLight active={centerSensor} /> {/* 中間傳感器 */}
            <SensorLight active={rightSensor} /> {/* 右邊傳感器 */}
          </div>
        </animated.div>
      </div>
    </animated.div>
  )
}

/**
 * [component] 舊版社團機器人視覺效果
 * @returns {JSX.Element} RoboticsVisual
 */
export const OldRoboticsVisual = () => {
  // 進入動畫
  const springZoomIn = useSpring({
    from: { opacity: 0, transform: 'scale(0.9)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: config.gentle,
  })

  return (
    <animated.div className={styles.visualContainer} style={springZoomIn}>
      <div className={styles.oldRoboticsScene}>
        <video
          src="https://firebasestorage.googleapis.com/v0/b/robot-group.firebasestorage.app/o/assets%2F%E7%A4%BE%E5%9C%98%E6%A9%9F%E5%99%A8%E4%BA%BA%E5%8B%95%E7%95%AB-%E7%84%A1%E7%B8%AB.mov?alt=media&token=e2116074-b88c-4f27-a7eb-357f9316a616"
          autoPlay
          loop
          muted
          playsInline
          className={styles.oldRoboticsVideo}
        />
      </div>
    </animated.div>
  )
}

/**
 * [component] iOS 視覺效果
 * @returns {JSX.Element} IOSVisual
 */
export const IOSVisual = () => {
  // 進入動畫
  const springZoomIn = useSpring({
    from: { opacity: 0, transform: 'scale(0.9)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: config.gentle,
  })

  // 從下滑入動畫
  const slideUp = useSpring({
    from: { transform: 'translateY(-100%)', opacity: 0 },
    to: { transform: 'translateY(0%)', opacity: 1 },
    delay: 3000,
    config: config.wobbly,
  })

  const [isChecked, setIsChecked] = useState(false)

  // 生成最近 5 天的日期數據
  const calendarData = useMemo(() => {
    const today = new Date()
    const days = []
    const weekLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

    for (let i = -2; i <= 2; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push({
        label: weekLabels[date.getDay()],
        date: date.getDate(),
        isActive: i === 0, // 今天
      })
    }
    return {
      days,
      monthName: today.toLocaleString('en-US', { month: 'long' }),
    }
  }, [])

  // Check In 按鈕動畫序列
  const { opacity, scale } = useSpring({
    from: { opacity: 0, scale: 1 },
    to: useCallback(async (next: any) => {
      // 1. 淡入顯示
      await next({ opacity: 1, delay: 300 })
      // 2. 等待
      await new Promise((resolve) => setTimeout(resolve, 500))
      // 3. 模擬點擊 (按下)
      await next({ scale: 0.9, config: { duration: 100 } })
      setIsChecked(true)
      // 4. 模擬點擊 (放開)
      await next({
        scale: 1,
        config: { duration: 300 },
      })
    }, []),
    config: config.gentle,
  })

  return (
    <animated.div className={styles.visualContainer} style={springZoomIn}>
      <div className={styles.phoneFrame}>
        <div className={styles.notch} />
        <div className={styles.screen}>
          <div className={styles.statusBar}>
            <span>
              {new Date().toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </span>
            <div className={styles.statusIcons} />
          </div>
          <div className={styles.appHeader}>
            <FontAwesomeIcon icon={faApple} />
            <span>Robotics</span>
          </div>
          <div className={styles.contentArea}>
            <div className={styles.calendarWidget}>
              <div className={styles.header}>
                <span className={styles.month}>{calendarData.monthName}</span>
              </div>
              <div className={styles.weekRow}>
                {calendarData.days.map((day, index) => (
                  <div
                    key={index}
                    className={`${styles.dayCol} ${
                      day.isActive ? styles.active : ''
                    }`}
                  >
                    <span className={styles.label}>{day.label}</span>
                    <span className={styles.date}>{day.date}</span>
                  </div>
                ))}
              </div>
            </div>
            <animated.div className={styles.notificationCard} style={slideUp}>
              <div className={styles.iconBox}>
                <FontAwesomeIcon icon={faBell} />
              </div>
              <div className={styles.textBox}>
                <div className={styles.lineLong} />
                <div className={styles.lineShort} />
              </div>
            </animated.div>
            <animated.div
              className={`${styles.checkInButton} ${
                isChecked ? styles.checked : ''
              }`}
              style={{
                opacity,
                transform: scale.to((s) => `scale(${s})`),
              }}
            >
              <FontAwesomeIcon icon={faCheckCircle} />
              <span>{isChecked ? 'Checked' : 'Check In'}</span>
            </animated.div>
          </div>
        </div>
      </div>
    </animated.div>
  )
}
