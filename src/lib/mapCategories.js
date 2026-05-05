import { MapPin, ForkKnife, Coffee, ShoppingCart, Books, GraduationCap, FirstAid, Barbell, Sparkle, GameController, ShoppingBag } from 'phosphor-react'

export const MAP_CATEGORIES = ['전체', '맛집', '카페', '마트', '스터디', '학교', '의료', '운동', '미용/뷰티', '여가', '쇼핑', '기타']

export const CATEGORY_ICONS = {
  '맛집': ForkKnife,
  '카페': Coffee,
  '마트': ShoppingCart,
  '스터디': Books,
  '학교': GraduationCap,
  '의료': FirstAid,
  '운동': Barbell,
  '미용/뷰티': Sparkle,
  '여가': GameController,
  '쇼핑': ShoppingBag,
  '기타': MapPin,
  '전체': MapPin
}

export const CATEGORY_COLORS = {
  '맛집': '#E74C3C',
  '카페': '#8B4513',
  '마트': '#3498DB',
  '스터디': '#9B59B6',
  '학교': '#E67E22',
  '의료': '#27AE60',
  '운동': '#C0392B',
  '미용/뷰티': '#E91E63',
  '여가': '#2980B9',
  '쇼핑': '#F39C12',
  '기타': '#95A5A6',
  '전체': '#34495E'
}