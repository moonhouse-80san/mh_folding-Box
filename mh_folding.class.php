<?php
	/**
	 * @class  mh_folding
	 * @author 팔공산 (80san@moonhouse.co.kr)
	 * @brief  에디터에서 접기/펼치기 박스(details/summary 스타일) 기능 제공
	 **/

	class mh_folding extends EditorHandler {

		protected int $editor_sequence = 0;
		protected string $component_path = '';

		public function __construct(int $editor_sequence, string $component_path) {
			$this->editor_sequence = $editor_sequence;
			$this->component_path = $component_path;
		}

		public function getPopupContent(): string {
			$tpl_path = $this->component_path . 'tpl';
			$tpl_file = 'popup.html';
			Context::set('tpl_path', $tpl_path);
			$oTemplate = TemplateHandler::getInstance();
			return $oTemplate->compile($tpl_path, $tpl_file);
		}

		private function safeColor(string $color, string $default = '#444444'): string {
			return preg_match('/^#[0-9a-fA-F]{3,6}$/', $color) ? $color : $default;
		}

		/* 14px, 1.2em, .85em, 100%, 12pt 형식만 허용. 값이 없거나 형식이 틀리면 빈 문자열(기본 CSS 크기 사용) */
		private function safeFontSize(string $size): string {
			$size = trim($size);
			return preg_match('/^\d+(\.\d+)?(px|em|rem|%|pt)$/', $size) ? $size : '';
		}

		public function transHTML($xml_obj): string {
			$ver          = $xml_obj->attrs->ver          ?? '';
			$ver_date     = $xml_obj->attrs->ver_date     ?? '';
			$ver_color    = $this->safeColor($xml_obj->attrs->ver_color    ?? '', '#2980b9');
			$marker_color = $this->safeColor($xml_obj->attrs->marker_color ?? '', '#ff6600');
			$bg_color     = $this->safeColor($xml_obj->attrs->bg_color     ?? '', '#f9f9f9');
			$font_color   = $this->safeColor($xml_obj->attrs->font_color   ?? '', '#444444');
			$badge        = $xml_obj->attrs->badge        ?? '';
			$default_open = $xml_obj->attrs->default_open ?? 'Y';
			$items        = $xml_obj->body                ?? '';

			/* 폰트 크기 (팝업에서 14px, 1.2em 등으로 입력) */
			$ver_size     = $this->safeFontSize($xml_obj->attrs->ver_size   ?? '');
			$date_size    = $this->safeFontSize($xml_obj->attrs->date_size  ?? '');
			$badge_size   = $this->safeFontSize($xml_obj->attrs->badge_size ?? '');
			$sub_size     = $this->safeFontSize($xml_obj->attrs->sub_size   ?? '');
			$sum_size     = $this->safeFontSize($xml_obj->attrs->sum_size   ?? '');

			$open_attr = ($default_open === 'Y') ? ' open' : '';

			/* 버전/날짜 표시 (색상 + 폰트 크기 동적, 나머지는 mh_folding.css 클래스로 처리) */
			$ver_display = '';
			if ($ver) {
				$ver_style = 'color:' . $ver_color . ';';
				if ($ver_size) $ver_style = 'font-size:' . $ver_size . ';' . $ver_style;
				$ver_display .= '<span class="mh_folding_ver" style="' . $ver_style . '">Ver ' . htmlspecialchars($ver, ENT_QUOTES) . '</span>';
			}
			if ($ver_date) {
				$date_style = 'color:' . $font_color . ';';
				if ($date_size) $date_style .= 'font-size:' . $date_size . ';';
				$ver_display .= '<span class="mh_folding_date" style="' . $date_style . '">' . htmlspecialchars($ver_date, ENT_QUOTES) . '</span>';
			}

			/* 배지 표시 */
			$badge_html = '';
			if ($badge) {
				$badge_style = $badge_size ? ' style="font-size:' . $badge_size . ';"' : '';
				foreach (explode(',', $badge) as $b) {
					$b = trim($b);
					if ($b === '') continue;
					$badge_class = ($b === '최신') ? 'mh_folding_badge_new_latest' : 'mh_folding_badge_new';
					$badge_html .= '<span class="' . $badge_class . '"' . $badge_style . '>' . htmlspecialchars($b, ENT_QUOTES) . '</span>';
				}
			}

			/*
			 * 항목 정규화: popup.js(buildItemsHtml)가 만드는 인라인 style 마크업을
			 * mh_folding.css 클래스로 치환한다. 이렇게 해야 예전에 인라인 style로
			 * 저장된 글도 화면 출력 시점(transHTML)에 최신 CSS 규칙을 그대로 따른다.
			 * (JS의 S_SUB 등 상수를 나중에 또 바꿔도, 이미 저장된 글까지 전부
			 *  다시 열어서 저장할 필요 없이 CSS 한 곳만 고치면 되도록 하기 위함)
			 */

			/* 항목/하위텍스트를 감싸는 div: 인라인 style → 클래스 */
			$items = preg_replace('/<div style="margin-bottom:6px;">/', '<div class="mh_folding_item">', $items);
			$items = preg_replace('/<div style="margin-bottom:4px;margin-left:1\.5em;">/', '<div class="mh_folding_subitem">', $items);

			/* 배지(버그수정 등) span: margin-right가 포함된 style → 클래스 */
			$items = preg_replace('/<span style="[^"]*margin-right[^"]*">/', '<span class="mh_folding_badge_bug">', $items);

			/* 소제목(sub) span: font-weight가 포함된(하위텍스트용 margin-left 제외) style → 클래스 */
			$items = preg_replace('/<span style="(?:(?!margin-left)[^"])*font-weight[^"]*">/', '<span class="mh_folding_sub">', $items);

			/* 하위 텍스트(tsub) span: margin-left:1.5em이 포함된 style → 클래스 */
			$items = preg_replace('/<span style="[^"]*margin-left:1\.5em[^"]*">/', '<span class="mh_folding_tsub">', $items);

			/* 남은 style 속성을 가진 span(요약/sum)은 전부 클래스로 치환 */
			$items = preg_replace('/<span style="[^"]*">/', '<span class="mh_folding_sum">', $items);

			/* 아주 예전(class="mf_bug"/"mf_sub"/"mf_sum") 저장 형식 호환 */
			$items = preg_replace('/<span class="mf_bug">/', '<span class="mh_folding_badge_bug">', $items);
			$items = preg_replace('/<span class="mf_sub">(.*?)<\/span>/su', '<strong class="mh_folding_sub">$1</strong>', $items);
			$items = preg_replace('/<span class="mf_sum">/', '<span class="mh_folding_sum">', $items);

			/*
			 * 그보다 더 예전(줄글 + <br>, div로 감싸여 있지 않은) 저장 형식 호환.
			 * 이미 위에서 <div>로 감싸진 최신 포맷에는 절대 다시 적용하지 않도록
			 * (이중으로 div가 씌워지는 것을 막기 위해) <div> 존재 여부로 가드한다.
			 */
			if (strpos($items, '<div') === false) {
				$items = preg_replace('/\x{2022}\s/u', '<div class="mh_folding_item">&bull; ', $items);
				$items = preg_replace('/<br\s*\/?>/', '</div>', $items);
			}

			/* 항목 내 폰트 크기 오버라이드 (클래스는 유지, style만 추가) */
			if ($badge_size) {
				$items = preg_replace('/<span class="mh_folding_badge_bug">/', '<span class="mh_folding_badge_bug" style="font-size:' . $badge_size . ';">', $items);
			}
			/* 소제목/내용/Sub내용은 크기 지정 여부와 상관없이 색상은 항상 font_color를 따라간다
			 * (배경색을 어둡게 바꿔도 회색 고정 글자색 때문에 안 보이는 문제 방지) */
			$sub_style = 'color:' . $font_color . ';';
			if ($sub_size) $sub_style .= 'font-size:' . $sub_size . ';';
			$items = preg_replace('/<span class="mh_folding_sub">/', '<span class="mh_folding_sub" style="' . $sub_style . '">', $items);
			$items = preg_replace('/<strong class="mh_folding_sub">/', '<strong class="mh_folding_sub" style="' . $sub_style . '">', $items);

			/* '내용' 색상/크기는 소제목 없는 요약문(sum)과 Sub내용(tsub)에 공통 적용 */
			$sum_style = 'color:' . $font_color . ';';
			if ($sum_size) $sum_style .= 'font-size:' . $sum_size . ';';
			$items = preg_replace('/<span class="mh_folding_sum">/', '<span class="mh_folding_sum" style="' . $sum_style . '">', $items);
			$items = preg_replace('/<span class="mh_folding_tsub">/', '<span class="mh_folding_tsub" style="' . $sum_style . '">', $items);

			$folding_info = new stdClass();
			$folding_info->open_attr          = $open_attr;
			$folding_info->bg_color           = $bg_color;
			$folding_info->font_color         = $font_color;
			$folding_info->marker_color       = $marker_color;
			$folding_info->ver_color          = $ver_color;
			$folding_info->ver_attr           = htmlspecialchars($ver, ENT_QUOTES);
			$folding_info->ver_date_attr      = htmlspecialchars($ver_date, ENT_QUOTES);
			$folding_info->badge_attr         = htmlspecialchars($badge, ENT_QUOTES);
			$folding_info->default_open_attr  = htmlspecialchars($default_open, ENT_QUOTES);
			$folding_info->ver_size           = $ver_size;
			$folding_info->date_size          = $date_size;
			$folding_info->badge_size         = $badge_size;
			$folding_info->sub_size           = $sub_size;
			$folding_info->sum_size           = $sum_size;
			$folding_info->summary_html       = $ver_display . $badge_html;
			$folding_info->body_html          = $items;

			Context::set('folding_info', $folding_info);

			$tpl_path = $this->component_path . 'tpl';
			Context::set('tpl_path', $tpl_path);

			$oTemplate = TemplateHandler::getInstance();
			return $oTemplate->compile($tpl_path, 'display.html');
		}
	}
?>
