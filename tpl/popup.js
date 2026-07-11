/**
 * folding 에디터 컴포넌트 팝업 스크립트
 **/

var selected_node = null;
var item_seq = 0;
var drag_src = null;
var sub_drag_src = null;

/* ── 항목(folding-item) Drag & Drop ── */
var S_NEW        = 'font-size:.8em;color:#999;border:1px solid #ddd;padding:3px 6px;border-radius:5px;margin-left:6px;';
var S_NEW_LATEST = 'font-size:.8em;color:#fff;background:#222;border:1px solid #222;padding:3px 6px;border-radius:5px;margin-left:6px;';
var S_BUG  = 'font-size:.8em;color:#999;border:1px solid #ddd;padding:3px 6px;border-radius:5px;margin-right:5px;';
var S_SUB  = 'font-size:.9em;color:#555;font-weight:bold !important;';
var S_SUM  = 'font-size:.85em;color:#666;';
var S_DATE = 'font-size:.85em;color:#444;';
var S_TSUB = 'font-size:.9em;color:#666;margin-left:1.5em;'; 

function makeDetailsStyle(bgColor) {
	return 'border:1px solid #ddd;background:' + (bgColor || '#f9f9f9') + ';padding:10px;border-radius:5px;margin:0 10px;';
}

function dateToDisplay(val) {
	if (!val) return '';
	var m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	return m ? m[1] + '.' + m[2] + '.' + m[3] : val;
}

function displayToDate(val) {
	if (!val) return '';
	var m = val.match(/^(\d{4})[.\-\/\s](\d{2})[.\-\/\s](\d{2})$/);
	return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
}

function getBadgeValue() {
	var badges = [];
	document.querySelectorAll('.badge-check:checked').forEach(function(c) { badges.push(c.value); });
	var custom = xGetElementById('badge_custom').value.trim();
	if (custom) badges.push(custom);
	return badges.join(',');
}

function escText(str) {
	return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function isValidHex(val) {
	return /^#[0-9a-fA-F]{3}$/.test(val) || /^#[0-9a-fA-F]{6}$/.test(val);
}

function bindColorPair(pickerId, hexId) {
	var picker = xGetElementById(pickerId);
	var hex    = xGetElementById(hexId);
	picker.addEventListener('input',  function() { hex.value = picker.value; updatePreview(); });
	picker.addEventListener('change', function() { hex.value = picker.value; updatePreview(); });
	hex.addEventListener('input', function() {
		var v = hex.value.trim();
		if (v && v.charAt(0) !== '#') v = '#' + v;
		hex.value = v;
		if (isValidHex(v)) { picker.value = v; updatePreview(); }
	});
	hex.addEventListener('blur', function() {
		if (!isValidHex(hex.value)) hex.value = picker.value;
		updatePreview();
	});
}

/* ── Drag & Drop ── */
/* ── 항목(folding-item) Drag & Drop ── */
function onDragStart(e) {
	drag_src = this.closest('.folding-item');
	drag_src.classList.add('dragging');
	e.dataTransfer.effectAllowed = 'move';
	e.dataTransfer.setData('text/plain', drag_src.id);
}
function onDragOver(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';
	var target = e.target.closest('.folding-item');
	if (!target || target === drag_src) return;
	var list = xGetElementById('item-list');
	var rect = target.getBoundingClientRect();
	if (e.clientY < rect.top + rect.height / 2) {
		list.insertBefore(drag_src, target);
	} else {
		list.insertBefore(drag_src, target.nextSibling);
	}
}
function onDragEnd() {
	if (drag_src) drag_src.classList.remove('dragging');
	drag_src = null;
	updatePreview();
}
function bindDragEvents(wrap, handle) {
	wrap.setAttribute('draggable', 'true');
	wrap.addEventListener('dragstart', onDragStart);
	wrap.addEventListener('dragover',  onDragOver);
	wrap.addEventListener('dragend',   onDragEnd);
}

/* ── Sub행 Drag & Drop (같은 sub-list 안에서만) ── */
function onSubDragStart(e) {
	sub_drag_src = this.closest('.sub-row');
	sub_drag_src.classList.add('dragging');
	e.dataTransfer.effectAllowed = 'move';
	e.dataTransfer.setData('text/plain', sub_drag_src.id);
	e.stopPropagation(); /* 부모 항목 드래그 이벤트 차단 */
}
function onSubDragOver(e) {
	e.preventDefault();
	e.stopPropagation();
	if (!sub_drag_src) return;
	var target = e.target.closest('.sub-row');
	if (!target || target === sub_drag_src) return;
	/* 같은 sub-list 안에서만 이동 */
	if (target.parentNode !== sub_drag_src.parentNode) return;
	var rect = target.getBoundingClientRect();
	if (e.clientY < rect.top + rect.height / 2) {
		target.parentNode.insertBefore(sub_drag_src, target);
	} else {
		target.parentNode.insertBefore(sub_drag_src, target.nextSibling);
	}
}
function onSubDragEnd(e) {
	if (sub_drag_src) sub_drag_src.classList.remove('dragging');
	sub_drag_src = null;
	updatePreview();
}
function bindSubDragEvents(row) {
	row.setAttribute('draggable', 'true');
	row.addEventListener('dragstart', onSubDragStart);
	row.addEventListener('dragover',  onSubDragOver);
	row.addEventListener('dragend',   onSubDragEnd);
}

/* ── Sub내용 행 추가 (부모 항목 wrap 내부 sub-list에 삽입) ── */
function addTextLine(val, parentSeq) {
	item_seq++;
	var seq = item_seq;

	var subList = xGetElementById('sublist_' + parentSeq);
	if (!subList) return;

	var row = document.createElement('div');
	row.className = 'sub-row';
	row.id = 'subrow_' + seq;
	row.setAttribute('data-parent', parentSeq);

	/* 드래그 핸들 */
	var handle = document.createElement('span');
	handle.className = 'drag-handle sub-drag-handle';
	handle.title = '드래그하여 순서 변경';
	handle.textContent = '⠿';

	var lbl = document.createElement('span');
	lbl.className = 'sum-label sub-label';
	lbl.textContent = 'Sub내용:';

	var inTxt = document.createElement('input');
	inTxt.type = 'text';
	inTxt.id = 'item_sum_' + seq;
	inTxt.className = 'inputTypeText f-sum';
	inTxt.placeholder = '• 없이 출력될 내용';
	inTxt.value = val || '';
	inTxt.addEventListener('input', updatePreview);

	var typeField = document.createElement('input');
	typeField.type = 'hidden';
	typeField.id = 'item_type_' + seq;
	typeField.value = 'text-only';

	var btnDel = document.createElement('button');
	btnDel.type = 'button';
	btnDel.className = 'btn-del';
	btnDel.textContent = '×';
	btnDel.addEventListener('click', (function(r) {
		return function() {
			r.parentNode.removeChild(r);
			updatePreview();
		};
	})(row));

	row.appendChild(handle);
	row.appendChild(lbl);
	row.appendChild(inTxt);
	row.appendChild(typeField);
	row.appendChild(btnDel);

	subList.appendChild(row);
	bindSubDragEvents(row);
	updatePreview();
}

/* ── 항목 추가 ── */
function addFoldingItem(badgeVal, subVal, sumVal, subLines) {
	item_seq++;
	var seq = item_seq;
	var badgeOptions = ['신규', '버그수정', '기능추가', '수정파일', '개선', '보안', '기타'];

	var wrap = document.createElement('div');
	wrap.className = 'folding-item';
	wrap.id = 'item_' + seq;

	/* 1행: 핸들 + 배지 + 소제목 + 삭제 */
	var row1 = document.createElement('div');
	row1.className = 'item-row1';

	var handle = document.createElement('span');
	handle.className = 'drag-handle';
	handle.title = '드래그하여 순서 변경';
	handle.textContent = '⠿';

	var sel = document.createElement('select');
	sel.id = 'item_badge_' + seq;
	sel.className = 'inputTypeText';
	[{v:'',t:'배지없음'}].concat(badgeOptions.map(function(b){return{v:b,t:b};})).forEach(function(o) {
		var opt = document.createElement('option');
		opt.value = o.v; opt.textContent = o.t;
		sel.appendChild(opt);
	});
	sel.addEventListener('change', updatePreview);
	if (badgeVal) sel.value = badgeVal;

	var inSub = document.createElement('input');
	inSub.type = 'text';
	inSub.id = 'item_sub_' + seq;
	inSub.className = 'inputTypeText f-sub';
	inSub.placeholder = '소제목';
	inSub.value = subVal || '';
	inSub.addEventListener('input', updatePreview);

	var btnDel = document.createElement('button');
	btnDel.type = 'button';
	btnDel.className = 'btn-del';
	btnDel.textContent = '×';
	btnDel.addEventListener('click', (function(s) { return function() { removeFoldingItem(s); }; })(seq));

	row1.appendChild(handle);
	row1.appendChild(sel);
	row1.appendChild(inSub);
	row1.appendChild(btnDel);

	/* 2행: 내용 + + 버튼 */
	var row2 = document.createElement('div');
	row2.className = 'item-row2';

	var lbl2 = document.createElement('span');
	lbl2.className = 'sum-label';
	lbl2.textContent = '내용:';

	var inSum = document.createElement('input');
	inSum.type = 'text';
	inSum.id = 'item_sum_' + seq;
	inSum.className = 'inputTypeText f-sum';
	inSum.placeholder = '내용을 입력하세요';
	inSum.value = sumVal || '';
	inSum.addEventListener('input', updatePreview);

	var btnAdd = document.createElement('button');
	btnAdd.type = 'button';
	btnAdd.className = 'btn-add-text';
	btnAdd.textContent = '+';
	btnAdd.title = 'Sub내용줄 추가';
	btnAdd.addEventListener('click', (function(s) {
		return function() { addTextLine('', s); };
	})(seq));

	row2.appendChild(lbl2);
	row2.appendChild(inSum);
	row2.appendChild(btnAdd);

	/* Sub내용 목록 영역 */
	var subList = document.createElement('div');
	subList.className = 'sub-list';
	subList.id = 'sublist_' + seq;

	wrap.appendChild(row1);
	wrap.appendChild(row2);
	wrap.appendChild(subList);

	xGetElementById('item-list').appendChild(wrap);
	bindDragEvents(wrap, handle);

	if (subLines && subLines.length) {
		subLines.forEach(function(v) { addTextLine(v, seq); });
	}

	updatePreview();
}

/* ── 항목 삭제 ── */
function removeFoldingItem(seq) {
	var el = xGetElementById('item_' + seq);
	if (el) el.parentNode.removeChild(el);
	updatePreview();
}

/* ── HTML 생성 ── */
function buildItemsHtml() {
	var html = '';
	document.querySelectorAll('#item-list > .folding-item').forEach(function(wrap) {
		var id    = wrap.id.replace('item_', '');
		var badge = xGetElementById('item_badge_' + id).value;
		var sub   = xGetElementById('item_sub_'   + id).value;
		var sum   = xGetElementById('item_sum_'   + id).value;

		html += '<div style="margin-bottom:6px;">';
		html += '\u2022 ';
		if (badge) html += '<span style="' + S_BUG + '">' + escText(badge) + '</span>';
		if (sub) {
			html += '<span style="' + S_SUB + '">' + escText(sub) + '</span>';
			html += ' - <span style="' + S_SUM + '">' + escText(sum) + '</span>';
		} else {
			html += '<span style="' + S_SUM + '">' + escText(sum) + '</span>';
		}
		html += '</div>';

		/* Sub내용 행들 */
		var subList = xGetElementById('sublist_' + id);
		if (subList) {
			subList.querySelectorAll('.sub-row').forEach(function(row) {
				var sid = row.id.replace('subrow_', '');
				var txt = xGetElementById('item_sum_' + sid).value;
				html += '<div style="margin-bottom:4px;margin-left:1.5em;">'
					+ '<span style="' + S_TSUB + '">' + escText(txt) + '</span>'
					+ '</div>';
			});
		}
	});
	return html;
}

function buildSummaryHtml(ver, ver_date_display, badge, verColor) {
	var S_VER = 'font-weight:bold;color:' + (verColor || '#2980b9') + ';';
	var html = '';
	if (ver)              html += '<span style="' + S_VER + '">Ver ' + escText(ver) + '</span>';
	if (ver_date_display) html += '<span style="' + S_DATE + '"> - ' + escText(ver_date_display) + '</span>';
	if (badge) {
		badge.split(',').forEach(function(b) {
			b = b.trim();
			if (b) {
				var s = (b === '최신') ? S_NEW_LATEST : S_NEW;
				html += '<span style="' + s + '">' + escText(b) + '</span>';
			}
		});
	}
	return html;
}

function updatePreview() {
	var ver          = xGetElementById('folding_ver').value;
	var ver_date_raw = xGetElementById('folding_ver_date').value;
	var ver_date_disp= dateToDisplay(ver_date_raw);
	var ver_color    = xGetElementById('folding_ver_color').value    || '#2980b9';
	var marker_color = xGetElementById('folding_marker_color').value || '#ff6600';
	var bg_color     = xGetElementById('folding_bg_color').value     || '#f9f9f9';
	var badge        = getBadgeValue();
	var def_open     = document.querySelector('input[name="default_open"]:checked');
	var open_attr    = (def_open && def_open.value === 'Y') ? ' open' : '';

	var marker_style = '<style>'
		+ '#preview-area details summary{list-style:none;}'
		+ '#preview-area details > summary::-webkit-details-marker{color:' + marker_color + ';}'
		+ '#preview-area details summary::marker{color:' + marker_color + ';}'
		+ '</style>';

	var html = marker_style
		+ '<details style="' + makeDetailsStyle(bg_color) + '"' + open_attr + '>'
		+ '<summary>' + buildSummaryHtml(ver, ver_date_disp, badge, ver_color) + '</summary>'
		+ '<div style="margin-top:12px;margin-left:5px">'
		+ (buildItemsHtml() || '<em style="color:#aaa">항목을 추가하세요</em>')
		+ '</div></details>';

	xGetElementById('preview-area').innerHTML = html;
}

function buildFoldingHTML(orig_node) {
	var ver          = xGetElementById('folding_ver').value;
	var ver_date_raw = xGetElementById('folding_ver_date').value;
	var ver_date_disp= dateToDisplay(ver_date_raw);
	var ver_color    = xGetElementById('folding_ver_color').value    || '#2980b9';
	var marker_color = xGetElementById('folding_marker_color').value || '#ff6600';
	var bg_color     = xGetElementById('folding_bg_color').value     || '#f9f9f9';
	var badge        = getBadgeValue();
	var def_open_el  = document.querySelector('input[name="default_open"]:checked');
	var default_open = def_open_el ? def_open_el.value : 'Y';
	var open_attr    = default_open === 'Y' ? ' open' : '';
	var summary_style= 'color:' + marker_color + ';';
	var body_html    = '';

	if (orig_node) {
		var orig_content = orig_node.querySelector(':scope > div');
		var new_items_list = buildItemsHtml().split(/(?=<div style="margin-bottom)/);
		new_items_list = new_items_list.filter(function(s) { return s.trim(); });
		var item_cursor = 0;

		if (orig_content) {
			var last_item_pos = -1;
			var parts = [];

			orig_content.childNodes.forEach(function(child) {
				if (child.nodeType === 3) { parts.push({html: child.textContent}); return; }
				if (child.nodeType !== 1) return;
				var inner = child.innerHTML || '';
				var isItem = inner.indexOf('&bull;') !== -1
					|| child.textContent.trim().charAt(0) === '\u2022'
					|| inner.indexOf('margin-left:1.5em') !== -1;

				if (isItem) {
					if (item_cursor < new_items_list.length) {
						parts.push({html: new_items_list[item_cursor++]});
					}
					last_item_pos = parts.length - 1;
				} else {
					parts.push({html: child.outerHTML});
				}
			});

			if (item_cursor < new_items_list.length) {
				var remaining = new_items_list.slice(item_cursor).join('');
				if (last_item_pos >= 0) {
					parts.splice(last_item_pos + 1, 0, {html: remaining});
				} else {
					parts.push({html: remaining});
				}
			}
			body_html = parts.map(function(p) { return p.html; }).join('');
		}
	} else {
		body_html = buildItemsHtml();
	}

	return '<details'
		+ ' style="' + makeDetailsStyle(bg_color) + '"'
		+ ' editor_component="mh_folding"'
		+ ' ver="' + escText(ver) + '"'
		+ ' ver_date="' + escText(ver_date_disp) + '"'
		+ ' ver_color="' + escText(ver_color) + '"'
		+ ' marker_color="' + escText(marker_color) + '"'
		+ ' bg_color="' + escText(bg_color) + '"'
		+ ' badge="' + escText(badge) + '"'
		+ ' default_open="' + default_open + '"'
		+ open_attr + '>'
		+ '<summary style="' + summary_style + '">'
		+ buildSummaryHtml(ver, ver_date_disp, badge, ver_color)
		+ '</summary>'
		+ '<div style="margin-top:12px;margin-left:5px">' + body_html + '</div>'
		+ '</details>';
}

function insertFolding() {
	if (typeof opener === 'undefined' || !opener) { window.close(); return; }

	var html = buildFoldingHTML(selected_node);

	if (selected_node && selected_node.parentNode) {
		try {
			selected_node.outerHTML = html;
		} catch(e) {
			try {
				var ownerDoc = selected_node.ownerDocument;
				var tmp = ownerDoc.createElement('div');
				tmp.innerHTML = html;
				selected_node.parentNode.replaceChild(tmp.firstChild, selected_node);
			} catch(e2) {
				opener.editorFocus(opener.editorPrevSrl);
				opener.editorReplaceHTML(opener.editorGetIFrame(opener.editorPrevSrl), html + '<br />');
			}
		}
	} else {
		opener.editorFocus(opener.editorPrevSrl);
		opener.editorReplaceHTML(opener.editorGetIFrame(opener.editorPrevSrl), html + '<br />');
	}

	opener.editorFocus(opener.editorPrevSrl);
	window.close();
}

/* ── 기존 노드 복원 ── */
function getFolding() {
	if (typeof opener === 'undefined' || !opener) return;
	var node = opener.editorPrevNode;
	if (!node || node.nodeName !== 'DETAILS') return;
	selected_node = node;

	xGetElementById('folding_ver').value = node.getAttribute('ver') || '';
	var saved_date = node.getAttribute('ver_date') || '';
	xGetElementById('folding_ver_date').value = displayToDate(saved_date) || saved_date;

	var vc = node.getAttribute('ver_color')    || '#2980b9';
	var mc = node.getAttribute('marker_color') || '#ff6600';
	var bc = node.getAttribute('bg_color')     || '#f9f9f9';
	xGetElementById('folding_ver_color').value        = vc;
	xGetElementById('folding_ver_color_hex').value    = vc;
	xGetElementById('folding_marker_color').value     = mc;
	xGetElementById('folding_marker_color_hex').value = mc;
	xGetElementById('folding_bg_color').value         = bc;
	xGetElementById('folding_bg_color_hex').value     = bc;

	var badge    = node.getAttribute('badge')        || '';
	var def_open = node.getAttribute('default_open') || 'Y';
	var standard = ['최신','신규','버그수정','기능추가','개선','첫버전','수정파일만 제공'];
	var badge_arr = badge.split(',').map(function(b) { return b.trim(); });
	document.querySelectorAll('.badge-check').forEach(function(chk) {
		chk.checked = badge_arr.indexOf(chk.value) !== -1;
	});
	var customs = badge_arr.filter(function(b) { return b && standard.indexOf(b) === -1; });
	if (customs.length) xGetElementById('badge_custom').value = customs.join(',');
	document.querySelectorAll('input[name="default_open"]').forEach(function(r) {
		r.checked = (r.value === def_open);
	});

	/* 항목 파싱 */
	var content_div = node.querySelector('div');
	if (!content_div) { updatePreview(); return; }

	var item_divs = content_div.querySelectorAll(':scope > div');
	if (item_divs.length > 0) {
		var currentSeq = null;
		item_divs.forEach(function(row) {
			var inner = row.innerHTML || '';
			var hasBull = inner.indexOf('&bull;') !== -1
				|| row.textContent.trim().charAt(0) === '\u2022';
			var isSub = !hasBull && inner.indexOf('margin-left:1.5em') !== -1;
			var isOther = !hasBull && !isSub;

			if (isOther) return; /* 이미지 등 비항목 — 팝업에서 표시 안 함 */

			if (hasBull) {
				var spans = row.querySelectorAll('span');
				var bv = '', sv = '', uv = '';
				spans.forEach(function(sp) {
					var t = sp.textContent.trim();
					var s = sp.getAttribute('style') || '';
					if      (s.indexOf('margin-right') !== -1)    bv = t;
					else if (s.indexOf('font-weight') !== -1) sv = t;
					else if (s.indexOf('.85em') !== -1 && s.indexOf('margin-left') === -1) uv = t;
				});
				/* 새 항목 추가 후 seq 추적 */
				var before = item_seq;
				addFoldingItem(bv, sv, uv);
				currentSeq = item_seq; /* addFoldingItem 후 item_seq가 seq */
			} else if (isSub && currentSeq) {
				var spans2 = row.querySelectorAll('span');
				var txt = spans2.length ? spans2[spans2.length - 1].textContent.trim() : row.textContent.trim();
				addTextLine(txt, currentSeq);
			}
		});
	} else {
		/* 구버전 <br/> 구조 */
		content_div.innerHTML.split(/<br\s*\/?>/i).forEach(function(line) {
			line = line.trim();
			if (!line) return;
			var tmp = document.createElement('div');
			tmp.innerHTML = line;
			var spans = tmp.querySelectorAll('span');
			var bv = '', sv = '', uv = '';
			spans.forEach(function(sp) {
				var t = sp.textContent.trim();
				var s = sp.getAttribute('style') || '';
				if      (s.indexOf('margin-right') !== -1)    bv = t;
				else if (s.indexOf('font-weight') !== -1) sv = t;
				else if (s.indexOf('.85em') !== -1)           uv = t;
			});
			if (sv || uv) addFoldingItem(bv, sv, uv);
		});
	}

	updatePreview();
}

/* ── 초기화 ── */
(function() {
	function onLoad() {
		bindColorPair('folding_ver_color',    'folding_ver_color_hex');
		bindColorPair('folding_marker_color', 'folding_marker_color_hex');
		bindColorPair('folding_bg_color',     'folding_bg_color_hex');

		/* 최신 배지 체크 여부에 따라 색상 자동 전환 */
		function applyLatestColors() {
			var latestChk = document.querySelector('.badge-check[value="최신"]');
			var isLatest  = latestChk && latestChk.checked;
			var vc = isLatest ? '#2980b9' : '#444444';
			var mc = isLatest ? '#ff6600' : '#444444';
			var bc = isLatest ? '#f9f9f9' : '#fcfcfc';
			xGetElementById('folding_ver_color').value        = vc;
			xGetElementById('folding_ver_color_hex').value    = vc;
			xGetElementById('folding_marker_color').value     = mc;
			xGetElementById('folding_marker_color_hex').value = mc;
			xGetElementById('folding_bg_color').value         = bc;
			xGetElementById('folding_bg_color_hex').value     = bc;
			updatePreview();
		}

		document.querySelectorAll('.badge-check').forEach(function(chk) {
			chk.addEventListener('change', function() {
				if (chk.value === '최신') applyLatestColors();
				else updatePreview();
			});
		});
		document.querySelectorAll('input[name="default_open"]').forEach(function(r) {
			r.addEventListener('change', updatePreview);
		});
		['folding_ver','folding_ver_date','badge_custom'].forEach(function(id) {
			xGetElementById(id).addEventListener('input', updatePreview);
		});
		xGetElementById('item-list').addEventListener('dragover', function(e) { e.preventDefault(); });

		var node = (typeof opener !== 'undefined' && opener) ? opener.editorPrevNode : null;
		if (!node || node.nodeName !== 'DETAILS') addFoldingItem('', '', '');
		getFolding();
	}

	if (typeof xAddEventListener !== 'undefined') xAddEventListener(window, 'load', onLoad);
	else window.addEventListener('load', onLoad);
})();
