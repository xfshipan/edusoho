import QuestionTypeBuilder from './question-type-builder';
import CopyDeny from './copy-deny';
import ActivityEmitter from "../../activity/activity-emitter";
import notify from "common/notify";

class DoTestBase
{
  constructor($container) {
    this.$container = $container;
    this.answers = {};
    this.usedTime = 0;
    this.$form = $container.find('form');
    this._initEvent();
    this._initUsedTimer();
    new CopyDeny();
  }

  _initEvent() {
    this.$container.on('focusin','textarea',event=>this._showEssayInputEditor(event));
    this.$container.on('click','[data-role="test-suspend"],[data-role="paper-submit"]',event=>this._btnSubmit(event));
    this.$container.on('click','.js-testpaper-question-list li',event=>this._choiceList(event));
    this.$container.on('click','*[data-anchor]',event=>this._quick2Question(event));
    this.$container.find('.js-testpaper-question-label').on('click','input',event=>this._choiceLable(event));
    this.$container.on('click','.js-btn-index',event=>this._clickBtnIndex(event));
    this.$container.on('click','.js-marking-toggle',event=>this._markingToggle(event));
    this.$container.on('click','.js-favorite-toggle',event=>this._favoriteToggle(event));
    this.$container.on('click','.js-analysis-toggle',event=>this._analysisToggle(event));
  }

  _markingToggle(event) {
    let $current = this._viewToggle(event);
    let id = $current.closest('.testpaper-question').attr('id');
    $(`a[data-anchor="#${id}"]`).toggleClass("have-pro");
  }

  _favoriteToggle(event) {
    let $current = this._viewToggle(event);
  }

  _analysisToggle(event) {
    let $current = this._viewToggle(event);
    $current.closest('.js-testpaper-question').find('.js-testpaper-question-analysis').slideToggle();
  }

  _viewToggle(event) {
    let  $this = $(event.currentTarget).toggleClass('active');
    let  $current  =  $this.children(':hidden');
    return $current;
  }

  _initUsedTimer() {
    let self = this;
    this.$usedTimer = window.setInterval(() =>{
      self.usedTime += 1;
    }, 1000);
  }

  _clickBtnIndex(event) {
    let $btn = $(event.currentTarget).addClass('doing');
    $btn.siblings('.doing').removeClass('doing');
    let $current = $($btn.data('anchor'));
    $(".js-testpaper-content").scrollTop($current.offset().top);
  }

  _choiceLable(event) {
    let $inputParents = $(event.currentTarget);
    this._renderBtnIndex($inputParents.attr('name'));
  }

  _renderBtnIndex(idNum,isChecked = true) {
    let $btn = $(`[data-anchor="#question${idNum}"]`);
    if(!isChecked) {
      $btn.removeClass('done').removeClass('doing');
      return;
    }
    let $doingBtn = $btn.siblings('.doing');
    $btn.addClass('doing').addClass('done');
    $doingBtn.removeClass('doing');
  }
  _showEssayInputEditor(event) {
    let $shortTextarea = $(event.currentTarget);

    if ($shortTextarea.hasClass('essay-input-short')) {
      
      event.preventDefault();
      event.stopPropagation();
      $(this).blur();
      let $longTextarea = $shortTextarea.siblings('.essay-input-long');
      let $textareaBtn = $longTextarea.siblings('.essay-input-btn');

      $shortTextarea.hide();
      $longTextarea.show();
      $textareaBtn.show();

      let editor = CKEDITOR.replace($longTextarea.attr('id'), {
        toolbar: 'Minimal',
        filebrowserImageUploadUrl: $longTextarea.data('imageUploadUrl')
      });

      editor.on('blur', e => {
        editor.updateElement();
        setTimeout(()=>{
          $longTextarea.val(editor.getData());
          $longTextarea.change();
          $longTextarea.val() ? this._renderBtnIndex($longTextarea.attr('name'),true) : this._renderBtnIndex($longTextarea.attr('name'),false);
        }, 1);
      });

      editor.on('instanceReady', function(e) {
        this.focus();

        $textareaBtn.one('click', function() {
          $shortTextarea.val($(editor.getData()).text());
          editor.destroy();
          $longTextarea.hide();
          $textareaBtn.hide();
          $shortTextarea.show();
        });
      });

      editor.on('key', function(){
        editor.updateElement();
        setTimeout(function() {
          $longTextarea.val(editor.getData());
          $longTextarea.change();
        }, 1);
      });

      editor.on('insertHtml', function(e) {
        editor.updateElement();
        setTimeout(function() {
          $longTextarea.val(editor.getData());
          $longTextarea.change();
        }, 1);
      });
    }
    
  }

  _choiceList(event) {
    let $target = $(event.currentTarget);
    let index = $target.index();
    let $input = $target.closest('.testpaper-question-body').siblings('.testpaper-question-footer').find('label').eq(index).find('input');

    let isChecked = $input.prop('checked');
    $input.prop('checked', !isChecked).change();

    isChecked = $input.prop('checked');
    let questionId = $input.attr('name');
    this._renderBtnIndex(questionId,isChecked)
  }

  _quick2Question(event) {
    let $target = $(event.currentTarget); 
    let position = $($target.data('anchor')).offset();
    $(document).scrollTop(position.top - 55);
  }

  _btnSubmit(event) {
    let $target = $(event.currentTarget);
    this._submitTest($target.data('url'));
  }

  _submitTest(url) {
    let values = {};
    let emitter = new ActivityEmitter();

    $('*[data-type]').each(function(index){
      let questionId = $(this).attr('name');
      let type = $(this).data('type');
      const questionTypeBuilder = QuestionTypeBuilder.getTypeBuilder(type);
      let answer = questionTypeBuilder.getAnswer(questionId);
      values[questionId] = answer;
    })
    
    $.post(url,{data:values,usedTime:this.usedTime})
    .done((response) => {
      if (response.result) {
        emitter.emit('finish');
      }
      if (response.goto) {
        window.location.href = response.goto;
      } else {
        notify('error', response.message);
      }
    })
    .error(function (response) {
      notify('error', response.error.message);
    });
  }

}

//临时方案，libs/vendor.js这个方法没有起作用
/*$(document).ajaxSend(function(a, b, c) {
  if (c.type == 'POST') {
    b.setRequestHeader('X-CSRF-Token', $('meta[name=csrf-token]').attr('content'));
  }
});*/

export default DoTestBase;