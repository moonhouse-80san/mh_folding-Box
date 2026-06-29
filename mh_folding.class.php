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

		public function transHTML($xml_obj): string {
			$ver          = $xml_obj->attrs->ver          ?? '';
			$ver_date     = $xml_obj->attrs->ver_date     ?? '';
			$ver_color    = $this->safeColor($xml_obj->attrs->ver_color    ?? '', '#2980b9');
			$marker_color = $this->safeColor($xml_obj->attrs->marker_color ?? '', '#ff6600');
			$bg_color     = $this->safeColor($xml_obj->attrs->bg_color     ?? '', '#f9f9f9');
			$badge        = $xml_obj->attrs->badge        ?? '';
			$default_open = $xml_obj->attrs->default_open ?? 'Y';
			$items        = $xml_obj->body                ?? '';

			if (!preg_match('/^#[0-9a-fA-F]{3,6}$/', $ver_color)) {
				$ver_color = '#2980b9';
			}

			$open_attr = ($default_open === 'Y') ? ' open' : '';

			$S_VER     = 'font-weight:bold;color:' . $ver_color . ';';
			$S_DATE    = 'font-size:.85em;color:#666;';
			$S_NEW        = 'font-size:.8em;color:#999;border:1px solid #ddd;padding:3px 6px;border-radius:5px;margin-left:6px;';
			$S_NEW_LATEST = 'font-size:.8em;color:#fff;background:#222;border:1px solid #222;padding:3px 6px;border-radius:5px;margin-left:6px;';
			$S_BUG     = 'font-size:.8em;color:#999;border:1px solid #ddd;padding:3px 6px;border-radius:5px;margin-right:5px;';
			$S_SUB     = 'font-size:.9em;color:#555;font-weight:500 !important;';
			$S_SUM     = 'font-size:.85em;color:#666;';
			$S_DETAILS = 'border:1px solid #ddd;background:' . $bg_color . ';padding:10px;border-radius:5px;margin:0 10px;';
			$S_SUMMARY = 'color:' . $marker_color . ';';

			$ver_display = '';
			if ($ver) {
				$ver_display .= '<span style="' . $S_VER . '">Ver ' . htmlspecialchars($ver, ENT_QUOTES) . '</span>';
			}
			if ($ver_date) {
				$ver_display .= '<span style="' . $S_DATE . '">' . htmlspecialchars($ver_date, ENT_QUOTES) . '</span>';
			}

			$badge_html = '';
			if ($badge) {
				foreach (explode(',', $badge) as $b) {
					$b = trim($b);
					if ($b === '') continue;
					$style = ($b === '최신') ? $S_NEW_LATEST : $S_NEW;
					$badge_html .= '<span style="' . $style . '">' . htmlspecialchars($b, ENT_QUOTES) . '</span>';
				}
			}

			$items = preg_replace('/<span class="mf_bug">/', '<span style="' . $S_BUG . '">', $items);
			$items = preg_replace('/<span class="mf_sub">/', '<span style="' . $S_SUB . '">', $items);
			$items = preg_replace('/<span class="mf_sum">/', '<span style="' . $S_SUM . '">', $items);
			/* 각 항목 줄을 div로 감싸 margin으로 간격 조절 */
			$items = preg_replace('/\x{2022}\s/u', '<div style="margin-bottom:6px;">&bull; ', $items);
			$items = preg_replace('/<br\s*\/?>/', '</div>', $items);

			$output = sprintf(
				'<details style="%s"%s editor_component="mh_folding" ver="%s" ver_date="%s" ver_color="%s" marker_color="%s" bg_color="%s" badge="%s" default_open="%s">',
				$S_DETAILS,
				$open_attr,
				htmlspecialchars($ver, ENT_QUOTES),
				htmlspecialchars($ver_date, ENT_QUOTES),
				htmlspecialchars($ver_color, ENT_QUOTES),
				htmlspecialchars($marker_color, ENT_QUOTES),
				htmlspecialchars($bg_color, ENT_QUOTES),
				htmlspecialchars($badge, ENT_QUOTES),
				$default_open
			);
			$output .= '<summary style="' . $S_SUMMARY . '">' . $ver_display . $badge_html . '</summary>';
			$output .= '<div style="margin-top:12px;margin-left:5px">' . $items . '</div>';
			$output .= '</details>';

			return $output;
		}
	}
?>
